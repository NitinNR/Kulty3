import { LayoutDashboard, MapPin, Calendar, Users, Scan, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const adminItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/venues', icon: MapPin, label: 'Venues' },
    { path: '/admin/events', icon: Calendar, label: 'Events' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/entries', icon: Scan, label: 'Entries' },
    { path: '/admin/bills', icon: 'Receipt', label: 'Bills' },
  ];

  const venueItems = [
    { path: '/venue/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/venue/scanner', icon: Scan, label: 'Scanner' },
    { path: '/venue/entries', icon: Users, label: 'Entries' },
    { path: '/venue/bills', icon: 'Receipt', label: 'Bills' },
  ];

  const menuItems = profile?.role === 'admin' ? adminItems : venueItems;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside className={`fixed md:static top-0 left-0 h-screen bg-white border-r border-gray-200 w-64 transition-transform md:translate-x-0 z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center text-white font-bold">K</div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Kulty</h1>
          </div>
          <p className="text-sm text-gray-600 capitalize">{profile?.role} Portal</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive(path)
                  ? 'bg-accent-100 text-accent-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
