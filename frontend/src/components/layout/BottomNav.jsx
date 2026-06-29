import { Compass, CalendarDays, CreditCard, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/home',    icon: Compass,      label: 'Discover'   },
  { path: '/events',  icon: CalendarDays, label: 'Events'     },
  { path: '/card',    icon: CreditCard,   label: 'Membership' },
  { path: '/profile', icon: User,         label: 'Profile'    },
];

export const BottomNav = () => {
  const { pathname } = useLocation();

  return (
    <div
      className="fixed md:hidden bottom-0 left-0 right-0 z-40"
      style={{ backgroundColor: '#0d0d0d', borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const active = pathname === path;
          return (
            <Link
              key={label}
              to={path}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition ${
                active ? 'text-accent-500' : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
