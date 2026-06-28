import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { createPaymentOrder, verifyPayment } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';

export const PaymentPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();

  useEffect(() => {
    if (profile?.subscription?.status === 'active') {
      navigate('/card');
    }
  }, [profile, navigate]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');

      const orderRes = await createPaymentOrder({ plan: 'annual' });
      const { id: orderId, amount, currency } = orderRes.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency,
        order_id: orderId,
        handler: async (response) => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            // Refresh profile so SubscriptionRoute sees updated subscription
            await refreshProfile();
            navigate('/payment/success');
          } catch (err) {
            setError('Payment verification failed. Please contact support.');
            console.error(err);
          }
        },
        prefill: {
          name: profile?.name,
          email: profile?.email,
          contact: profile?.phone,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError('Payment failed. Please try again.');
        console.error(response.error);
      });
      rzp.open();
    } catch (err) {
      setError('Failed to initiate payment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Annual Membership</h1>
            <p className="text-gray-600">Exclusive access to premium venues & cashback rewards</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="bg-gradient-to-br from-accent-50 to-amber-50 rounded-xl p-8 mb-8 border-2 border-accent-200">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-2">Annual Price</p>
              <div className="text-5xl font-display font-bold text-gray-900 mb-2">
                ₹999
              </div>
              <p className="text-gray-600 text-sm">/year</p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Digital Membership Card</p>
                <p className="text-sm text-gray-600">Your premium QR membership card</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Exclusive Venue Access</p>
                <p className="text-sm text-gray-600">Discover and enjoy premium venues</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Cashback Rewards</p>
                <p className="text-sm text-gray-600">Earn cashback on every bill upload</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Event Access</p>
                <p className="text-sm text-gray-600">Special member-only events</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePayment}
            disabled={loading}
            className="w-full mb-4"
            variant="primary"
            size="lg"
          >
            {loading ? <Spinner size="sm" /> : 'Continue with Razorpay'}
          </Button>

          <p className="text-center text-xs text-gray-500">
            Secure payment powered by Razorpay. Your card details are safe.
          </p>
        </div>
      </div>
    </div>
  );
};
