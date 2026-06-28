import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import { signInWithGoogle, setupPhoneAuth, sendPhoneOTP } from '../../services/firebase';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Spinner } from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';

export const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('method');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, profile } = useAuth();

  // Redirect once profile is loaded
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    if (!profile) return; // still fetching

    if (profile.role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (profile.role === 'venue_owner') {
      navigate('/venue', { replace: true });
    } else if (!profile.name) {
      navigate('/complete-profile', { replace: true });
    } else if (profile.subscription?.status === 'active') {
      // Already a subscribed member — skip path selection
      navigate('/home', { replace: true });
    } else if (!profile.intentRole) {
      // New user who hasn't chosen their path yet
      navigate('/choose-path', { replace: true });
    } else if (profile.intentRole === 'venue_owner') {
      navigate('/apply-venue', { replace: true });
    } else {
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

  const handleSendOTP = async () => {
    try {
      setLoading(true);
      setError('');
      const recaptchaVerifier = setupPhoneAuth('recaptcha-container');
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const result = await sendPhoneOTP(formattedPhone, recaptchaVerifier);
      setConfirmationResult(result);
      setStep('otp');
    } catch (err) {
      setError('Failed to send OTP. Please check the phone number and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setLoading(true);
      setError('');
      await confirmationResult.confirm(otp);
      // AuthContext will pick up via onAuthStateChanged
    } catch (err) {
      setError('Invalid OTP. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  // Show spinner while auth is resolving
  if (authLoading || (isAuthenticated && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-white text-sm">Setting up your account...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) return null; // redirecting

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
              K
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Kulty</h1>
            <p className="text-gray-600">Membership Made Easy</p>
          </div>

          <div id="recaptcha-container" />

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {step === 'method' && (
            <div className="space-y-4">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                {loading ? <Spinner size="sm" /> : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-400">or continue with phone</span>
                </div>
              </div>

              <div className="space-y-3">
                <Input
                  type="tel"
                  placeholder="+91 XXXXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={loading}
                />
                <button
                  onClick={handleSendOTP}
                  disabled={loading || !phoneNumber}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 hover:border-yellow-500 text-gray-700 font-medium rounded-lg transition disabled:opacity-50"
                >
                  {loading ? <Spinner size="sm" /> : <Phone className="w-5 h-5" />}
                  Send OTP
                </button>
              </div>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <p className="text-center text-gray-600 text-sm">
                OTP sent to <strong>{phoneNumber}</strong>
              </p>
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                maxLength="6"
                className="text-center text-2xl tracking-widest"
              />
              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                {loading ? <Spinner size="sm" /> : 'Verify OTP'}
              </button>
              <button
                onClick={() => { setStep('method'); setOtp(''); setPhoneNumber(''); }}
                disabled={loading}
                className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
