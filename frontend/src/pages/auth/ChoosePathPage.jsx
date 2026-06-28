import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Building2, CheckCircle } from 'lucide-react';
import { updateProfile } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/common/Spinner';

const MEMBER_BENEFITS = [
  'Annual digital membership card with QR',
  'Exclusive access to premium partner venues',
  'Cashback rewards on every bill you upload',
  'Member-only events and experiences',
  'Priority support',
];

const VENUE_BENEFITS = [
  'Free registration — no membership fee',
  'Web portal to scan member QR codes',
  'Log and track every member visit',
  'Review and approve member bill uploads',
  'Manage your venue details and staff',
];

export const ChoosePathPage = () => {
  const [choosing, setChoosing] = useState(null); // 'member' | 'venue_owner'
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleChoose = async (intent) => {
    setChoosing(intent);
    try {
      await updateProfile({ intentRole: intent });
      await refreshProfile();
      if (intent === 'member') {
        navigate('/payment', { replace: true });
      } else {
        navigate('/apply-venue', { replace: true });
      }
    } catch (err) {
      console.error(err);
      setChoosing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-yellow-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            K
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Kulty3</h1>
          <p className="text-gray-400">How would you like to get started?</p>
        </div>

        {/* Two path cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Member path */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mb-5">
              <CreditCard className="w-6 h-6 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Join as Member</h2>
            <p className="text-sm text-gray-500 mb-6">
              Get an annual membership, discover premium venues, and earn cashback on every visit.
            </p>

            <ul className="space-y-2.5 mb-8 flex-1">
              {MEMBER_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="mb-3">
              <p className="text-xs text-gray-400 text-center mb-3">Annual subscription required</p>
              <button
                onClick={() => handleChoose('member')}
                disabled={!!choosing}
                className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {choosing === 'member' ? <Spinner size="sm" /> : null}
                Join as Member — ₹999/yr
              </button>
            </div>
          </div>

          {/* Venue owner path */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col border-2 border-yellow-400">
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full">
                Free to join
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">List my Venue</h2>
            <p className="text-sm text-gray-500 mb-6">
              Register your restaurant, club, or lounge and manage Kulty3 member visits and cashbacks.
            </p>

            <ul className="space-y-2.5 mb-8 flex-1">
              {VENUE_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="mb-3">
              <p className="text-xs text-gray-400 text-center mb-3">Requires admin approval · Usually 24–48 hrs</p>
              <button
                onClick={() => handleChoose('venue_owner')}
                disabled={!!choosing}
                className="w-full py-3.5 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {choosing === 'venue_owner' ? <Spinner size="sm" /> : null}
                Apply as Venue Owner — Free
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          You can always contact us if you need to switch paths later.
        </p>
      </div>
    </div>
  );
};
