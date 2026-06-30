import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Shield, Zap, Star } from 'lucide-react';
import { createPaymentOrder, verifyPayment } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';

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
  const navigate              = useNavigate();
  const { profile, refreshProfile } = useAuth();

  // Load Razorpay SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src   = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // Already subscribed → skip this page
  useEffect(() => {
    if (profile?.subscription?.status === 'active') navigate('/card', { replace: true });
  }, [profile, navigate]);

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
          } catch {
            setError('Payment verification failed. Please contact support.');
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
          onClick={() => navigate('/choose-path')}
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

        {/* CTA */}
        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-opacity disabled:opacity-60"
          style={{ background: T.gold, color: '#0d0d0d' }}
        >
          {loading ? <Spinner size="sm" /> : <>Continue with Razorpay &rarr;</>}
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
