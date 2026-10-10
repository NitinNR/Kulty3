import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isSubscriptionLive } from '../../utils/subscription';

const MAX_ATTEMPTS = 8;
const POLL_MS = 1500;

export const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [state, setState] = useState('confirming'); // confirming | active | delayed

  // refreshProfile is re-created on every AuthProvider render, so it is held in
  // a ref — putting it in the effect deps would restart the poll each render.
  const refreshRef = useRef(refreshProfile);
  refreshRef.current = refreshProfile;

  useEffect(() => {
    let cancelled = false;

    // The membership is normally activated by /verify before this page mounts.
    // If the browser dropped that call, the Razorpay webhook settles it — so
    // poll briefly rather than redirecting into an inactive card screen.
    const confirm = async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        const profile = await refreshRef.current();
        if (cancelled) return;
        if (isSubscriptionLive(profile?.subscription)) {
          setState('active');
          setTimeout(() => {
            if (!cancelled) navigate('/card', { replace: true });
          }, 1800);
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      if (!cancelled) setState('delayed');
    };

    confirm().catch(() => {
      if (!cancelled) setState('delayed');
    });

    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-2xl p-10">
          {state === 'delayed' ? (
            <>
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-12 h-12 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment received</h1>
              <p className="text-gray-500 mb-6">
                Your membership is still being confirmed. This usually takes under a
                minute — it activates automatically once Razorpay confirms the payment.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/card', { replace: true })}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors"
                >
                  Go to membership card
                </button>
                <button
                  onClick={() => navigate('/home', { replace: true })}
                  className="w-full py-3 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Continue exploring
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Payment Successful!</h1>
              <p className="text-gray-500 mb-6">
                Your annual membership is now active.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-yellow-500 rounded-full animate-spin" />
                Redirecting to your membership card...
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};