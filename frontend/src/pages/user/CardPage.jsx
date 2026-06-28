import { useNavigate } from 'react-router-dom';
import { Download, Home } from 'lucide-react';
import { MembershipCard } from '../../components/card/MembershipCard';
import { Button } from '../../components/common/Button';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { useAuth } from '../../hooks/useAuth';

export const CardPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleDownloadCard = () => {
    const svg = document.querySelector('#card-to-download svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Kulty-Card-${profile?.membershipId || 'member'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Your Membership Card
          </h1>
          <p className="text-gray-600">
            Your exclusive access to premium venues and cashback rewards
          </p>
        </div>

        <div id="card-to-download" className="mb-12">
          <MembershipCard user={profile} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
          <Button
            onClick={handleDownloadCard}
            variant="primary"
            size="lg"
            className="flex-1"
          >
            <Download className="w-5 h-5" />
            Download Card
          </Button>
          <Button
            onClick={() => navigate('/home')}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-2xl">🎫</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Venue Access</h3>
            <p className="text-sm text-gray-600">
              Exclusive access to premium venues across the city
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Cashback Rewards</h3>
            <p className="text-sm text-gray-600">
              Earn cashback on every bill you upload
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-3">
              <span className="text-2xl">🎉</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Special Events</h3>
            <p className="text-sm text-gray-600">
              Member-only events and exclusive experiences
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
