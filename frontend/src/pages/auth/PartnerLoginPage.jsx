import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ScanLine, ReceiptText, Users, ArrowLeft, LogOut, AlertCircle } from 'lucide-react';
import { signInWithGoogle } from '../../services/firebase';
import { updateProfile } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';

const T = {
  bg:     '#0d0d0d',
  card:   '#141414',
  lite:   '#1c1c1c',
  border: 'rgba(255,255,255,0.08)',
  text:   'rgba(255,255,255,0.9)',
  muted:  'rgba(255,255,255,0.45)',
  dim:    'rgba(255,255,255,0.25)',
  gold:   '#f59e0b',
};

const PERKS = [
  { icon: ScanLine,    label: 'QR member scanning',    desc: 'Scan Kulty member cards at entry right from your web portal' },
  { icon: ReceiptText, label: 'Bills & cashback logs', desc: 'Track visits, review uploaded bills, and manage cashbacks' },
  { icon: Users,       label: 'Reach premium members', desc: 'Get discovered by thousands of paying members near you' },
];

export const PartnerLoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [existingMember, setExistingMember] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, authLoading, profile, refreshProfile, logout } = useAuth();

  // Whether the user was already signed in when this page opened.
  // If so, require a fresh Google sign-in before showing the venue flow.
  const wasAuthedOnMount = useRef(isAuthenticated);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (!profile) return;

    // Already signed in before landing here → show the sign-out gate
    if (wasAuthedOnMount.current) return;

    if (profile.role === 'admin') { setExistingMember(false); navigate('/admin', { replace: true }); return; }
    if (profile.role === 'venue_owner' || profile.role === 'venue_staff') { setExistingMember(false); navigate('/venue', { replace: true }); return; }

    // Already tagged as a venue owner applicant → keep them on the venue flow
    if (profile.intentRole === 'venue_owner') {
      setExistingMember(false);
      navigate(profile.name ? '/apply-venue' : '/complete-profile?next=/apply-venue', { replace: true });
      return;
    }

    // Brand-new account (never completed a profile) → venue owner onboarding
    if (!profile.name) {
      setExistingMember(false);
      updateProfile({ intentRole: 'venue_owner' })
        .then(() => refreshProfile())
        .catch(() => {});
      navigate('/complete-profile?next=/apply-venue', { replace: true });
      return;
    }

    // Existing registered account (e.g. a member) → NEVER auto-tag as venue owner
    setExistingMember(true);
  }, [isAuthenticated, authLoading, profile, navigate, refreshProfile]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      wasAuthedOnMount.current = false;
      setExistingMember(false);
    } catch (err) {
      console.error(err);
    }
  };

  const goToAccount = () => {
    if (profile?.role === 'admin') navigate('/admin');
    else if (profile?.role === 'venue_owner' || profile?.role === 'venue_staff') navigate('/venue');
    else navigate('/home');
  };

  if (authLoading || (isAuthenticated && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: T.bg }}>
        <Spinner size="lg" />
      </div>
    );
  }

  // Already signed in → require sign-out so a different Google account can be used
  if (isAuthenticated && wasAuthedOnMount.current) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: T.bg }}>
        <div className="w-full max-w-md">
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-center gap-1.5 mb-8">
              <span style={{ fontSize: '8px', color: 'rgba(245,158,11,0.55)', lineHeight: 1 }}>◆</span>
              <span className="font-display font-bold" style={{ fontSize: '20px', color: T.text, letterSpacing: '0.14em' }}>
                KULTY
              </span>
            </div>

            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <Building2 className="w-7 h-7" style={{ color: T.gold }} />
            </div>

            <h1 className="text-xl font-bold mb-2" style={{ color: T.text }}>Already signed in</h1>
            <p className="text-sm leading-relaxed mb-6" style={{ color: T.muted }}>
              You're currently signed in as{' '}
              <strong style={{ color: T.text }}>{profile?.name || profile?.email || 'a member'}</strong>.
              To join as a venue owner, please sign out first and then sign in again with your venue owner Google account.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition hover:opacity-90"
                style={{ backgroundColor: T.gold, color: '#0d0d0d' }}
              >
                <LogOut className="w-4 h-4" /> Sign out & continue as venue owner
              </button>
              <button
                onClick={goToAccount}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm transition hover:bg-white/5"
                style={{ backgroundColor: T.lite, color: T.text, border: `1px solid ${T.border}` }}
              >
                Go to my account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Signed in fresh but the Google account is already registered as a member
  if (isAuthenticated && existingMember) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: T.bg }}>
        <div className="w-full max-w-md">
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
            <div className="flex items-center justify-center gap-1.5 mb-8">
              <span style={{ fontSize: '8px', color: 'rgba(245,158,11,0.55)', lineHeight: 1 }}>◆</span>
              <span className="font-display font-bold" style={{ fontSize: '20px', color: T.text, letterSpacing: '0.14em' }}>
                KULTY
              </span>
            </div>

            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertCircle className="w-7 h-7" style={{ color: '#f87171' }} />
            </div>

            <h1 className="text-xl font-bold mb-2" style={{ color: T.text }}>Account already registered</h1>
            <p className="text-sm leading-relaxed mb-1" style={{ color: T.muted }}>
              This Google account (<strong style={{ color: T.text }}>{profile?.email || profile?.name}</strong>) is already
              registered as a member. It cannot be used to apply as a venue owner.
            </p>
            <p className="text-sm leading-relaxed mb-6" style={{ color: T.muted }}>
              Please sign out and sign in with a different Google account to continue with the venue owner application.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition hover:opacity-90"
                style={{ backgroundColor: T.gold, color: '#0d0d0d' }}
              >
                <LogOut className="w-4 h-4" /> Sign out & try another account
              </button>
              <button
                onClick={goToAccount}
                className="w-full px-4 py-3 rounded-xl font-semibold text-sm transition hover:bg-white/5"
                style={{ backgroundColor: T.lite, color: T.text, border: `1px solid ${T.border}` }}
              >
                Go to my member account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) return null; // fresh sign-in redirecting to venue onboarding

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: T.bg }}>
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-center gap-1.5 mb-8">
            <span style={{ fontSize: '8px', color: 'rgba(245,158,11,0.55)', lineHeight: 1 }}>◆</span>
            <span className="font-display font-bold" style={{ fontSize: '20px', color: T.text, letterSpacing: '0.14em' }}>
              KULTY
            </span>
          </div>

          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
          >
            <Building2 className="w-7 h-7" style={{ color: T.gold }} />
          </div>

          <h1 className="text-2xl font-bold text-center mb-1" style={{ color: T.text }}>Partner with Kulty</h1>
          <p className="text-sm text-center mb-7 leading-relaxed" style={{ color: T.muted }}>
            List your venue and manage member visits, bills & cashbacks.
          </p>

          {error && (
            <div
              className="mb-6 p-4 rounded-xl text-sm"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50"
            style={{ backgroundColor: T.gold, color: '#0d0d0d' }}
          >
            {loading ? <Spinner size="sm" /> : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google as Venue Owner
              </>
            )}
          </button>

          <p className="text-xs text-center mt-4" style={{ color: T.dim }}>
            Free to join · Requires admin approval (24–48 hrs)
          </p>
        </div>

        {/* Perks */}
        <div className="mt-5 space-y-3">
          {PERKS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: T.lite }}>
                <Icon className="w-4 h-4" style={{ color: T.gold }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: T.text }}>{label}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: T.muted }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/login')}
          className="flex items-center justify-center gap-1.5 mx-auto mt-6 text-xs transition hover:opacity-70"
          style={{ color: T.dim }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to member login
        </button>
      </div>
    </div>
  );
};
