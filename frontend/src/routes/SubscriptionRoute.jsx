import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/common/Spinner';
import { isSubscriptionLive } from '../utils/subscription';

export const SubscriptionRoute = ({ children }) => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  // Venue owner applicants (pending approval) should not be pushed to payment
  if (profile?.intentRole === 'venue_owner') {
    return <Navigate to="/apply-venue" replace />;
  }

  // Live term, not merely status 'active' — a lapsed membership must be sent to
  // checkout rather than treated as entitled.
  if (!isSubscriptionLive(profile?.subscription)) {
    return <Navigate to="/payment" replace />;
  }

  return children;
};
