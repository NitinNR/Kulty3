import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageSquare, ArrowLeft, Building2, LogOut } from 'lucide-react';
import { signInWithGoogle, signInWithCustomToken } from '../../services/firebase';
import {
  initMsg91Widget,
  isMsg91Configured,
  isMsg91Initialized,
  sendMsg91Otp,
  extractMsg91ReqId,
  getMsg91ErrorMessage,
  MSG91_CAPTCHA_RENDER_ID,
  MSG91_CAPTCHA_ANCHOR_ID,
} from '../../services/msg91';
import { retryMsg91Otp, verifyMsg91Otp } from '../../services/api';
import { useMsg91Captcha, setMsg91LoginStep } from '../../hooks/useMsg91Captcha';
import { useAppSettings } from '../../hooks/useAppSettings';
import { Spinner } from '../../components/common/Spinner';
import { OtpInput } from '../../components/auth/OtpInput';
import { useAuth } from '../../hooks/useAuth';
import { isSubscriptionLive } from '../../utils/subscription';

const DEFAULT_OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

// Dark / gold Kulty theme (matches the Partner login page).
const T = {
  bg:         '#0d0d0d',
  card:       '#141414',
  lite:       '#1c1c1c',
  border:     'rgba(255,255,255,0.08)',
  text:       'rgba(255,255,255,0.92)',
  muted:      'rgba(255,255,255,0.5)',
  dim:        'rgba(255,255,255,0.3)',
  gold:       '#f59e0b',
  goldSoft:   'rgba(245,158,11,0.12)',
  goldBorder: 'rgba(245,158,11,0.25)',
};

// Only India is enabled for now. Other countries are shown but disabled so the
// dropdown is clearly a country selector without allowing non-Indian numbers.
const COUNTRY_CODES = [
  { code: 'IN', dial: '91',  flag: '🇮🇳', name: 'India',          enabled: true  },
  { code: 'US', dial: '1',   flag: '🇺🇸', name: 'United States',  enabled: false },
  { code: 'GB', dial: '44',  flag: '🇬🇧', name: 'United Kingdom', enabled: false },
  { code: 'AE', dial: '971', flag: '🇦🇪', name: 'UAE',            enabled: false },
  { code: 'AU', dial: '61',  flag: '🇦🇺', name: 'Australia',      enabled: false },
];

// MSG91 identifiers must contain the country code without a leading '+'.
const normalizePhone = (raw, dialCode = '91') => {
  let digits = String(raw || '').replace(/\D/g, '');
  // Local (India) 10-digit number → prepend the country code.
  if (dialCode === '91' && digits.length === 10) digits = `91${digits}`;
  return digits;
};

const GoogleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('method');
  const [countryCode, setCountryCode] = useState('91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [reqId, setReqId] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [partnerAccount, setPartnerAccount] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, profile, logout } = useAuth();
  const widgetReadyRef = useRef(false);

  // Captcha requirement / OTP length come from the shared MSG91 store, which
  // also decides when the captcha host (App.jsx) is visible.
  const { required: captchaRequired, verified: captchaOk, otpLength: widgetOtpLength } =
    useMsg91Captcha();
  const otpLength = widgetOtpLength > 0 ? widgetOtpLength : DEFAULT_OTP_LENGTH;

  // Which sign-in methods the admin has enabled (defaults to both).
  const { authMethods } = useAppSettings();
  const googleEnabled = authMethods.google;
  const phoneEnabled = authMethods.phone;

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Tell the captcha host (App.jsx) which part of the flow we're on so it can
  // hide the captcha once the OTP step is reached.
  useEffect(() => {
    setMsg91LoginStep(step);
  }, [step]);

  // Redirect once profile is loaded
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setPartnerAccount(false); return; }

    if (!profile) return; // still fetching

    // A venue-partner account (started sign-up on /partner → intentRole
    // 'venue_owner') must not be used to sign in / up on the member side. Flag it
    // and let the render show a notice instead of routing them into the app.
    const isPartnerApplicant =
      profile.intentRole === 'venue_owner' &&
      profile.role !== 'admin' &&
      profile.role !== 'venue_owner' &&
      profile.role !== 'venue_staff';

    setPartnerAccount(isPartnerApplicant);
    if (isPartnerApplicant) return;

    if (profile.role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (profile.role === 'venue_owner' || profile.role === 'venue_staff') {
      navigate('/venue', { replace: true });
    } else if (!profile.name) {
      navigate('/complete-profile', { replace: true });
    } else if (isSubscriptionLive(profile.subscription)) {
      // Already a subscribed member — go straight to the app
      navigate('/home', { replace: true });
    } else {
      // New users are members by default — proceed to subscription payment
      navigate('/payment', { replace: true });
    }
  }, [isAuthenticated, authLoading, profile, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
      // AuthContext will pick up the new user via onAuthStateChanged
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  // Ensures the widget is initialized (it's memoized and normally started once
  // at app level when phone sign-in is enabled, so this usually just awaits the
  // existing init). Passing the captcha host id keeps the lazy path identical.
  const ensureWidget = async () => {
    if (widgetReadyRef.current && isMsg91Initialized()) return;
    await initMsg91Widget({ captchaRenderId: MSG91_CAPTCHA_RENDER_ID });
    widgetReadyRef.current = true;
  };

  const handleSendOTP = async () => {
    try {
      setSending(true);
      setError('');

      if (!isMsg91Configured()) {
        throw new Error('Phone login is not available right now. Please use Google.');
      }

      const formattedPhone = normalizePhone(phoneNumber, countryCode);
      if (formattedPhone.length < 11) {
        throw new Error('Please enter a valid phone number.');
      }

      await ensureWidget();

      // Sends the OTP via the widget; resolves on success, rejects on failure.
      const data = await sendMsg91Otp(formattedPhone);
      setReqId(extractMsg91ReqId(data));
      setOtp('');
      setCooldown(RESEND_COOLDOWN);
      setStep('otp');
    } catch (err) {
      setError(getMsg91ErrorMessage(err, 'Failed to send OTP. Please check the phone number and try again.'));
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setSending(true);
      setError('');
      // Backend resends on SMS and returns a fresh reqId.
      const res = await retryMsg91Otp(reqId);
      const nextReqId = res.data?.reqId;
      if (nextReqId) setReqId(nextReqId);
      setOtp('');
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(getMsg91ErrorMessage(err, 'Failed to resend OTP. Please try again.'));
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOTP = async (code) => {
    const value = code || otp;
    if (value.length < otpLength) return;
    try {
      setLoading(true);
      setError('');

      // 1. Backend verifies the OTP with MSG91, validates the access token and
      //    returns a Firebase custom token.
      const res = await verifyMsg91Otp(reqId, value);
      const customToken = res.data?.customToken;
      if (!customToken) {
        throw new Error('Login failed. Please try again.');
      }

      // 2. Exchange for a real Firebase session — AuthContext takes over.
      await signInWithCustomToken(customToken);
    } catch (err) {
      setError(getMsg91ErrorMessage(err, 'Invalid OTP. Please try again.'));
      console.error(err);
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('method');
    setOtp('');
    setError('');
    setCooldown(0);
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {
      console.error(err);
    }
  };

  // Send the partner applicant back to their venue-owner onboarding.
  const continuePartnerApplication = () => {
    navigate(profile?.name ? '/apply-venue' : '/complete-profile?next=/apply-venue');
  };

  // Show spinner while auth is resolving
  if (authLoading || (isAuthenticated && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: T.bg }}>
        <Spinner size="lg" />
      </div>
    );
  }

  // Signed in with a venue-partner account → block the member login/signup and
  // tell the user why, pointing them back to the partner flow.
  if (isAuthenticated && partnerAccount) {
    const identifier = profile?.email || profile?.phone || profile?.name || 'this account';
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
        style={{ backgroundColor: T.bg }}
      >
        <div
          className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.16), transparent 70%)' }}
        />
        <div className="w-full max-w-md relative animate-fade-in">
          <div className="rounded-3xl p-7 sm:p-8 shadow-2xl text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-center gap-1.5 mb-6">
              <span style={{ fontSize: '8px', color: 'rgba(245,158,11,0.55)', lineHeight: 1 }}>◆</span>
              <span className="font-display font-bold" style={{ fontSize: '20px', color: T.text, letterSpacing: '0.14em' }}>
                KULTY
              </span>
            </div>

            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ backgroundColor: T.goldSoft, border: `1px solid ${T.goldBorder}` }}
            >
              <Building2 className="w-6 h-6" style={{ color: T.gold }} />
            </div>

            <h1 className="text-xl font-bold mb-2" style={{ color: T.text }}>
              You can't sign in with this account
            </h1>
            <p className="text-sm leading-relaxed mb-1" style={{ color: T.muted }}>
              <strong style={{ color: T.text }}>{identifier}</strong> is registered as a Kulty
              venue partner. A partner account can't be used to log in or sign up as a member.
            </p>
            <p className="text-sm leading-relaxed mb-6" style={{ color: T.muted }}>
              Continue your venue partner application, or sign out and use a different account.
            </p>

            <div className="space-y-3">
              <button
                onClick={continuePartnerApplication}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition hover:opacity-90"
                style={{ backgroundColor: T.gold, color: '#0d0d0d' }}
              >
                <Building2 className="w-4 h-4" /> Continue venue partner application
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition hover:bg-white/5"
                style={{ backgroundColor: T.lite, color: T.text, border: `1px solid ${T.border}` }}
              >
                <LogOut className="w-4 h-4" /> Sign out & use another account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) return null; // redirecting

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ backgroundColor: T.bg }}
    >
      {/* Ambient gold glow */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.16), transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.10), transparent 70%)' }}
      />

      <div className="w-full max-w-md relative animate-fade-in">
        <div className="rounded-3xl p-7 sm:p-8 shadow-2xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>

          {/* Wordmark */}
          <div className="flex items-center justify-center gap-1.5 mb-6">
            <span style={{ fontSize: '8px', color: 'rgba(245,158,11,0.55)', lineHeight: 1 }}>◆</span>
            <span className="font-display font-bold" style={{ fontSize: '20px', color: T.text, letterSpacing: '0.14em' }}>
              KULTY
            </span>
          </div>

          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-sm flex items-start gap-2"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            >
              <span className="leading-5">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {step === 'method' && (
            <div className="space-y-5">
              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: T.goldSoft, border: `1px solid ${T.goldBorder}` }}
                >
                  {phoneEnabled
                    ? <Phone className="w-6 h-6" style={{ color: T.gold }} />
                    : <GoogleIcon className="w-6 h-6" style={{ color: T.gold }} />}
                </div>
                <h1 className="text-2xl font-bold" style={{ color: T.text }}>Welcome back</h1>
                <p className="text-sm mt-1" style={{ color: T.muted }}>Sign in to continue to Kulty</p>
              </div>

              {!googleEnabled && !phoneEnabled && (
                <p className="text-center text-sm" style={{ color: T.muted }}>
                  No sign-in method is currently available. Please try again later.
                </p>
              )}

              {googleEnabled && (
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading || sending}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition hover:bg-white/5 disabled:opacity-50"
                  style={{ backgroundColor: T.lite, color: T.text, border: `1px solid ${T.border}` }}
                >
                  {loading ? <Spinner size="sm" /> : (
                    <>
                      <GoogleIcon className="w-5 h-5" />
                      Continue with Google
                    </>
                  )}
                </button>
              )}

              {googleEnabled && phoneEnabled && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ backgroundColor: T.border }} />
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: T.dim }}>or use phone</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: T.border }} />
                </div>
              )}

              {phoneEnabled && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <select
                    aria-label="Country code"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    disabled={loading || sending}
                    className="shrink-0 pl-3 pr-2 py-3 rounded-xl text-sm outline-none transition disabled:opacity-50"
                    style={{ backgroundColor: T.lite, border: `1px solid ${T.border}`, color: T.text }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.dial} disabled={!c.enabled} style={{ backgroundColor: '#1c1c1c' }}>
                        {c.flag} +{c.dial}{!c.enabled ? ' (soon)' : ''}
                      </option>
                    ))}
                  </select>

                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="Mobile number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    disabled={loading || sending}
                    className="flex-1 min-w-0 px-4 py-3 rounded-xl text-sm outline-none transition placeholder:text-white/30 disabled:opacity-50"
                    style={{ backgroundColor: T.lite, border: `1px solid ${T.border}`, color: T.text, caretColor: T.gold }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.55)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = T.border; }}
                  />
                </div>

                {/* MSG91 renders its captcha here (moved in by Msg91CaptchaHost). */}
                <div id={MSG91_CAPTCHA_ANCHOR_ID} className="flex justify-center overflow-x-auto no-scrollbar" />

                <button
                  onClick={handleSendOTP}
                  disabled={loading || sending || phoneNumber.length !== 10 || (captchaRequired && !captchaOk)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: T.gold, color: '#0d0d0d' }}
                >
                  {sending ? <Spinner size="sm" /> : 'Send OTP'}
                </button>

                {captchaRequired && !captchaOk && (
                  <p className="text-center text-xs" style={{ color: T.gold }}>
                    Please complete the verification challenge above to continue.
                  </p>
                )}
              </div>
              )}
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-5">
              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: T.goldSoft, border: `1px solid ${T.goldBorder}` }}
                >
                  <MessageSquare className="w-6 h-6" style={{ color: T.gold }} />
                </div>
                <h1 className="text-2xl font-bold" style={{ color: T.text }}>Verify your number</h1>
                <p className="text-sm mt-1" style={{ color: T.muted }}>
                  Enter the {otpLength}-digit code sent to
                </p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: T.text }}>
                  +{countryCode} {phoneNumber}
                </p>
              </div>

              <OtpInput
                value={otp}
                length={otpLength}
                onChange={setOtp}
                onComplete={handleVerifyOTP}
                disabled={loading}
              />

              <button
                onClick={() => handleVerifyOTP()}
                disabled={loading || otp.length < otpLength}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: T.gold, color: '#0d0d0d' }}
              >
                {loading ? <Spinner size="sm" /> : 'Verify & Continue'}
              </button>

              <div className="flex items-center justify-between text-sm pt-1">
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="flex items-center gap-1.5 transition hover:opacity-70 disabled:opacity-40"
                  style={{ color: T.muted }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change number
                </button>

                {cooldown > 0 ? (
                  <span style={{ color: T.dim }}>Resend in {cooldown}s</span>
                ) : (
                  <button
                    onClick={handleResendOTP}
                    disabled={loading || sending}
                    className="font-semibold transition hover:opacity-80 disabled:opacity-40"
                    style={{ color: T.gold }}
                  >
                    {sending ? 'Sending…' : 'Resend OTP'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-5" style={{ color: T.dim }}>
          Membership Made Easy · 🎉 Party and Earn
        </p>
      </div>
    </div>
  );
};
