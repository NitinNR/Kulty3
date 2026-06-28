import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building2, QrCode, FileText, LogOut, CalendarDays, ClipboardList } from 'lucide-react';
import { getAdminStats, getAdminApplications } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/common/Spinner';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pendingApps, setPendingApps] = useState(0);
  const [loading, setLoading] = useState(true);
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getAdminStats(),
      getAdminApplications({ status: 'pending' }),
    ])
      .then(([statsRes, appsRes]) => {
        setStats(statsRes.data);
        setPendingApps(appsRes.data?.pending || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats
    ? [
        { label: 'Total Members', value: stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600' },
        { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: QrCode, color: 'bg-green-50 text-green-600' },
        { label: 'Venue Owners', value: stats.totalVenues, icon: Building2, color: 'bg-purple-50 text-purple-600' },
        { label: 'Total Entries', value: stats.totalEntries, icon: FileText, color: 'bg-amber-50 text-amber-600' },
      ]
    : [];

  const navItems = [
    {
      label: 'Venue Applications',
      desc: 'Review and approve venue owner applications',
      path: '/admin/applications',
      icon: ClipboardList,
      badge: pendingApps > 0 ? pendingApps : null,
    },
    { label: 'Manage Users & Roles', desc: 'Promote users to admin or venue owner', path: '/admin/users', icon: Users },
    { label: 'Venues', desc: 'Add, edit, or deactivate venues', path: '/admin/venues', icon: Building2 },
    { label: 'Events', desc: 'Create and manage member events', path: '/admin/events', icon: CalendarDays },
    { label: 'Entry Logs', desc: 'All member check-in records', path: '/admin/entries', icon: QrCode },
    { label: 'Bills', desc: 'Review all uploaded bills', path: '/admin/bills', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between shadow">
        <div>
          <h1 className="text-xl font-bold">Kulty3 Admin</h1>
          <p className="text-xs text-gray-400">{profile?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Dashboard Overview</h2>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {statCards.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-xl p-5 shadow-sm">
                  <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Navigation cards */}
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {navItems.map(({ label, desc, path, icon: Icon, badge }) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="bg-white rounded-xl p-6 shadow-sm text-left hover:shadow-md transition group flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-900 group-hover:text-white transition flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-600 group-hover:text-white transition" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{label}</p>
                      {badge && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
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
