import { Menu, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { logout } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const Navbar = () => {
  const [openMenu, setOpenMenu] = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center text-white font-bold">K</div>
            <h1 className="text-2xl font-display font-bold text-gray-900">Kulty</h1>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {profile && <span className="text-sm text-gray-600">{profile.name}</span>}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-700 hover:text-accent-500 transition"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setOpenMenu(!openMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {openMenu && (
          <div className="md:hidden pb-4 border-t border-gray-200 flex flex-col gap-2">
            {profile && <span className="text-sm text-gray-600 px-2">{profile.name}</span>}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-700 px-2 py-2 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
