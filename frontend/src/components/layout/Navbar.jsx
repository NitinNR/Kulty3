import { useState } from 'react';
import { Search, Menu, X, LogOut } from 'lucide-react';
import { logout } from '../../services/firebase';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV_LINKS = [
  { label: 'Venues',     href: '/home'    },
  { label: 'Events',     href: '/events'  },
  { label: 'History',    href: '/entries' },
  { label: 'Membership', href: '/card'    },
  { label: 'Profile',    href: '/profile' },
];

export const Navbar = () => {
  const [open, setOpen]  = useState(false);
  const navigate          = useNavigate();
  const location          = useLocation();
  const { profile }       = useAuth();
  const isMember          = profile?.subscription?.status === 'active';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const Avatar = ({ size = 'md' }) => {
    const cls = size === 'sm'
      ? 'w-8 h-8 text-xs'
      : 'w-9 h-9 text-sm';
    return (
      <div
        className={`${cls} rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border-2`}
        style={{ backgroundColor: '#2a2a2a', borderColor: 'rgba(245,158,11,0.5)' }}
      >
        {profile?.profilePhoto
          ? <img src={profile.profilePhoto} alt="" className="w-full h-full object-cover" />
          : <span className="text-white font-bold">{profile?.name?.[0]?.toUpperCase() || 'K'}</span>
        }
      </div>
    );
  };

  return (
    <nav
      className="sticky top-0 z-50"
      style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative flex items-center justify-between h-16">

          {/* ── Mobile hamburger (left) ─────────────────── */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 text-gray-400 hover:text-white transition"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* ── Logo ───────────────────────────────────── */}
          {/* Centered on mobile, left on desktop */}
          <Link
            to="/home"
            className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
          >
            <div className="w-7 h-7 bg-accent-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-gray-900 font-bold text-sm leading-none">K</span>
            </div>
            <span className="text-accent-500 font-display font-bold text-xl leading-none">Kulty</span>
          </Link>

          {/* ── Desktop nav links ───────────────────────── */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={label}
                to={href}
                className={`text-sm font-medium transition-colors ${
                  location.pathname === href
                    ? 'text-white'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* ── Right cluster ───────────────────────────── */}
          <div className="flex items-center gap-2.5">
            {/* Search icon — desktop */}
            <button
              onClick={() => navigate('/home')}
              className="hidden md:flex w-9 h-9 items-center justify-center rounded-full text-gray-500 hover:text-white transition"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Member badge + avatar — desktop */}
            {isMember && (
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right leading-none">
                  <p className="text-white text-xs font-medium lowercase">{profile?.name || 'member'}</p>
                  <p className="text-xs font-bold tracking-widest mt-0.5" style={{ color: 'rgba(245,158,11,0.75)' }}>
                    PREMIUM PLUS
                  </p>
                </div>
                <button onClick={() => navigate('/profile')}>
                  <Avatar />
                </button>
              </div>
            )}

            {/* Avatar only — mobile */}
            <button className="md:hidden" onClick={() => navigate('/profile')}>
              <Avatar size="sm" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer ─────────────────────────────── */}
      {open && (
        <div
          className="md:hidden px-4 pb-5"
          style={{ backgroundColor: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {isMember && (
            <div
              className="flex items-center gap-3 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Avatar />
              <div>
                <p className="text-white text-sm font-medium">{profile?.name}</p>
                <p className="text-xs font-bold tracking-widest mt-0.5" style={{ color: 'rgba(245,158,11,0.75)' }}>
                  PREMIUM PLUS
                </p>
              </div>
            </div>
          )}

          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              to={href}
              onClick={() => setOpen(false)}
              className="flex items-center py-3.5 text-sm font-medium text-gray-400 hover:text-white transition"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              {label}
            </Link>
          ))}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 pt-4 text-sm text-gray-500 hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </nav>
  );
};
