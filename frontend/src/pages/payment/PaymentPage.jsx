import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Shield, Zap, Star, AlertTriangle } from 'lucide-react';
import { createPaymentOrder, verifyPayment, getMyPayments } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { isSubscriptionLive } from '../../utils/subscription';

// How long a still-unsettled order is treated as "possibly paid, don't retry".
const RECENT_PAYMENT_MS = 30 * 60 * 1000;
const GUARD_POLL_ATTEMPTS = 5;
const GUARD_POLL_MS = 3000;

const T = {
  bg:     '#0d0d0d',
  card:   '#141414',
  card2:  '#1a1a1a',
  border: 'rgba(255,255,255,0.07)',
  gold:   '#f59e0b',
  text:   'rgba(255,255,255,0.9)',
  sub:    'rgba(255,255,255,0.5)',
  dim:    'rgba(255,255,255,0.22)',
};

const PERKS = [
  { icon: Star,    label: 'Digital Membership Card',   desc: 'Premium QR card accepted at all partner venues'   },
  { icon: Zap,     label: 'Cashback on Every Bill',    desc: 'Upload bills and earn cashback automatically'      },
  { icon: Check,   label: 'Exclusive Venue Access',    desc: 'Discover and enter premium partner venues'         },
  { icon: Shield,  label: 'Member-only Events',        desc: 'Priority access to curated experiences'            },
];

export const PaymentPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [checkingInFlight, setCheckingInFlight] = useState(true);
  const [inFlightPayment, setInFlightPayment]   = useState(null);
  const navigate              = useNavigate();
  const { profile, refreshProfile } = useAuth();

  // refreshProfile is re-created on every AuthProvider render, so it is held in
  // a ref — putting it in an effect dep list would restart the poll each render.
  const refreshRef = useRef(refreshProfile);
  refreshRef.current = refreshProfile;

  // Load Razorpay SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src   = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // Already subscribed → skip this page.
  // Keyed on "live", not just status: a lapsed term still reads as
  // status 'active' in a stale profile, and that member must be able to renew.
  const hasLiveSub = isSubscriptionLive(profile?.subscription);

  useEffect(() => {
    if (profile && hasLiveSub) navigate('/card', { replace: true });
  }, [profile, hasLiveSub, navigate]);

  /**
   * Double-charge guard.
   *
   * If a previous order is still unsettled, this member may already have paid —
   * the browser could have closed before /verify, and the webhook may not have
   * landed yet. Paying again would charge them twice. So: give the settlement a
   * few seconds to arrive, send them straight to the card if it does, and warn
   * rather than silently re-offering checkout if it does not.
   */
  useEffect(() => {
    if (!profile || hasLiveSub) { setCheckingInFlight(false); return; }
    let cancelled = false;

    const run = async () => {
      for (let attempt = 0; attempt < GUARD_POLL_ATTEMPTS; attempt += 1) {
        try {
          // GET /payments/my also triggers server-side reconciliation of this
          // member's stuck orders, so this call can itself settle the payment.
          const { data } = await getMyPayments();

          // Always re-read the freshest entitlement: the reconcile above may
          // have just activated it, and the local profile would be stale.
          const fresh = await refreshRef.current();
          if (cancelled) return;

          if (isSubscriptionLive(fresh?.subscription)) {
            navigate('/payment/success', { replace: true });
            return;
          }

          const recent = (data?.payments || []).find(
            (p) => p.status === 'created' && Date.now() - new Date(p.createdAt).getTime() < RECENT_PAYMENT_MS
          );
          setInFlightPayment(recent || null);

          // Nothing pending and still not live — safe to show checkout.
          if (!recent) { setCheckingInFlight(false); return; }
        } catch {
          // A failed check must never block checkout — fail open.
          if (!cancelled) { setInFlightPayment(null); setCheckingInFlight(false); return; }
        }

        await new Promise((r) => setTimeout(r, GUARD_POLL_MS));
      }
      if (!cancelled) setCheckingInFlight(false);
    };

    run();
    return () => { cancelled = true; };
  }, [profile, hasLiveSub, navigate]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');

      const orderRes = await createPaymentOrder({ plan: 'annual' });
      const { id: orderId, amount, currency } = orderRes.data;

      const options = {
        key:      import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        order_id: orderId,
        name:     'Kulty Membership',
        description: 'Annual Membership — ₹999/year',
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            await refreshProfile();
            navigate('/payment/success');
          } catch (err) {
            // The money is captured at this point even if verification failed.
            // Say so, so the member waits for the webhook instead of retrying
            // and paying twice.
            setError(
              err?.response?.data?.error ||
              'Payment received but verification is pending. Your membership will activate within a minute — refresh in a moment.'
            );
          }
        },
        prefill: {
          name:    profile?.name,
          email:   profile?.email,
          contact: profile?.phone,
        },
        theme: { color: '#f59e0b' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => setError('Payment failed. Please try again.'));
      rzp.open();
    } catch {
      setError('Failed to initiate payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: T.bg }}>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${T.border}`, background: T.card }}
      >
        <button
          onClick={() => navigate('/home')}
          className="rounded-xl p-2 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: T.sub }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-base leading-tight" style={{ color: T.text }}>Annual Membership</h1>
          <p className="text-xs mt-0.5" style={{ color: T.sub }}>◆ KULTY Premium</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-md mx-auto w-full px-4 py-8 flex flex-col gap-5">

        {/* Price card */}
        <div
          className="rounded-2xl p-6 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a1400 0%, #0d0d0d 60%)',
            border: `1px solid rgba(245,158,11,0.3)`,
            boxShadow: '0 0 40px rgba(245,158,11,0.08)',
          }}
        >
          {/* Glow accent */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }}
          />

          <p className="text-xs font-semibold tracking-[0.18em] uppercase mb-3" style={{ color: T.sub }}>
            ◆ KULTY Premium Plus
          </p>
          <div className="flex items-start justify-center gap-1 mb-1">
            <span className="text-2xl font-bold mt-1" style={{ color: T.gold }}>₹</span>
            <span className="text-6xl font-bold leading-none" style={{ color: T.text }}>999</span>
          </div>
          <p className="text-sm mb-4" style={{ color: T.sub }}>per year · billed annually</p>

          <div
            className="inline-block rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: T.gold }}
          >
            Founding member price — limited spots
          </div>
        </div>

        {/* Perks list */}
        <div
          className="rounded-2xl divide-y"
          style={{ background: T.card, border: `1px solid ${T.border}`, divideColor: T.border }}
        >
          {PERKS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(245,158,11,0.1)' }}
              >
                <Icon className="w-4 h-4" style={{ color: T.gold }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: T.text }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: T.sub }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            {error}
          </div>
        )}

        {/* In-flight payment guard — a previous order may already have been paid */}
        {inFlightPayment && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex gap-3"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.28)', color: '#fbbf24' }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">You have a payment we're still confirming</p>
              <p className="mt-1" style={{ color: 'rgba(251,191,36,0.8)' }}>
                An order placed a few minutes ago hasn't finished settling. If you
                already paid, give it a moment — your membership activates
                automatically and you will not be charged again. Only continue if
                you're sure the previous attempt didn't go through.
              </p>
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handlePayment}
          disabled={loading || checkingInFlight}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-opacity disabled:opacity-60"
          style={{ background: T.gold, color: '#0d0d0d' }}
        >
          {loading ? <Spinner size="sm" />
            : checkingInFlight ? <>Checking payment status…</>
            : inFlightPayment ? <>Pay again anyway &rarr;</>
            : <>Continue with Razorpay &rarr;</>}
        </button>

        {/* Skip */}
        <button
          onClick={() => navigate('/home')}
          className="text-sm text-center transition-opacity hover:opacity-70"
          style={{ color: T.sub }}
        >
          Maybe later — explore the app first
        </button>

        <p className="text-center text-xs" style={{ color: T.dim }}>
          Secure payment via Razorpay. Cancel anytime.
        </p>
      </div>
    </div>
  );
};
