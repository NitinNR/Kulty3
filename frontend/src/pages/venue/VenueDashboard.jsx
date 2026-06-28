import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, History, FileText, Settings, LogOut, Building2 } from 'lucide-react';
import { getMyVenue } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/common/Spinner';

export const VenueDashboard = () => {
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getMyVenue()
      .then((res) => {
        const venues = res.data?.venues || [];
        if (venues.length > 0) setVenue(venues[0]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const actions = [
    {
      label: 'Scan Member QR',
      desc: 'Scan a member\'s card to log venue entry',
      icon: QrCode,
      path: '/venue/scanner',
      highlight: true,
    },
    {
      label: 'Entry Logs',
      desc: 'View all members who visited today',
      icon: History,
      path: '/venue/entries',
    },
    {
      label: 'Bill Approvals',
      desc: 'Review and approve uploaded bills',
      icon: FileText,
      path: '/venue/bills',
    },
    {
      label: 'Venue Settings',
      desc: 'Update your venue profile and details',
      icon: Settings,
      path: '/venue/settings',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Venue Portal</h1>
          <p className="text-xs text-gray-400">{profile?.name}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <>
            {/* Venue info card */}
            {venue ? (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-8 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{venue.name}</h2>
                  <p className="text-sm text-gray-500">{venue.city} · {venue.category}</p>
                  <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full font-medium ${
                    venue.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {venue.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8 text-center">
                <p className="text-sm text-amber-800 font-medium">No venue assigned yet.</p>
                <p className="text-xs text-amber-600 mt-1">Ask an admin to create and assign a venue to your account.</p>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-1 gap-4">
              {actions.map(({ label, desc, icon: Icon, path, highlight }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`rounded-xl p-5 text-left flex items-start gap-4 transition shadow-sm ${
                    highlight
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'bg-white text-gray-900 hover:shadow-md'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    highlight ? 'bg-white bg-opacity-10' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${highlight ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div>
                    <p className="font-semibold">{label}</p>
                    <p className={`text-sm mt-0.5 ${highlight ? 'text-gray-400' : 'text-gray-500'}`}>
                      {desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
