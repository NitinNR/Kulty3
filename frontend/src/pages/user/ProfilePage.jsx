import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { Badge } from '../../components/common/Badge';
import { MembershipCard } from '../../components/card/MembershipCard';
import { format } from 'date-fns';
import { CreditCard, LogOut } from 'lucide-react';

export const ProfilePage = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  const isActive = profile.subscription?.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-8">My Profile</h1>

        {/* Membership Card Preview */}
        {isActive && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Membership Card</h2>
              <button
                onClick={() => navigate('/card')}
                className="flex items-center gap-2 text-sm font-medium text-accent-600 hover:text-accent-700 transition"
              >
                <CreditCard className="w-4 h-4" />
                View Full Card
              </button>
            </div>
            <MembershipCard user={profile} />
            <button
              onClick={() => navigate('/card')}
              className="mt-4 w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Open Membership Card
            </button>
          </div>
        )}

        {/* Profile details */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <div className="flex items-start gap-6 mb-8">
            {profile.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                alt={profile.name}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
                {profile.name?.[0]?.toUpperCase() || 'K'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
              <p className="text-gray-500 text-sm mt-0.5">{profile.email}</p>
              {profile.phone && <p className="text-gray-500 text-sm">{profile.phone}</p>}
              <div className="mt-2">
                <Badge variant={isActive ? 'success' : 'warning'}>
                  {isActive ? 'Active Member' : profile.subscription?.status || 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                Member ID
              </p>
              <p className="text-base font-mono font-semibold text-gray-900">
                {profile.membershipId || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                Role
              </p>
              <p className="text-base text-gray-900 capitalize">{profile.role}</p>
            </div>

            {profile.subscription?.startDate && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Member Since
                </p>
                <p className="text-base text-gray-900">
                  {format(new Date(profile.subscription.startDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}

            {profile.subscription?.endDate && (
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Expires
                </p>
                <p className="text-base text-gray-900">
                  {format(new Date(profile.subscription.endDate), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Membership Benefits</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Exclusive access to premium venues
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Digital membership card with QR code
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Cashback rewards on bill uploads
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Member-only events and experiences
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Priority support
            </li>
          </ul>
        </div>

        {/* Sign out */}
        {logout && (
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
