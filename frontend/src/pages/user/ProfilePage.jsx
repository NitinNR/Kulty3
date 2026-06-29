import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { MembershipCard } from '../../components/card/MembershipCard';
import { format } from 'date-fns';
import {
  CreditCard, LogOut, Zap, Gift, Ticket, Star,
  CalendarDays, Clock, ChevronRight,
} from 'lucide-react';

const T = {
  bg:       '#0d0d0d',
  card:     '#141414',
  cardLite: '#1c1c1c',
  border:   'rgba(255,255,255,0.07)',
  sub:      'rgba(255,255,255,0.55)',
  dim:      'rgba(255,255,255,0.22)',
  gold:     '#f59e0b',
};

const BENEFITS = [
  { icon: Zap,       text: 'Priority entry at all partner venues' },
  { icon: Gift,      text: 'Cashback rewards on every bill upload' },
  { icon: Ticket,    text: 'Exclusive member-only events access'  },
  { icon: Star,      text: 'Welcome drink at selected venues'     },
];

export const ProfilePage = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  const isActive = profile.subscription?.status === 'active';

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0" style={{ backgroundColor: T.bg }}>
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">

        {/* ── Profile header ── */}
        <div
          className="flex items-center gap-5 rounded-2xl p-6 mb-6"
          style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
        >
          {/* Avatar */}
          {profile.profilePhoto ? (
            <img
              src={profile.profilePhoto}
              alt={profile.name}
              className="w-20 h-20 rounded-full object-cover flex-shrink-0"
              style={{ border: '2px solid rgba(245,158,11,0.4)' }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: T.gold, border: '2px solid rgba(245,158,11,0.3)' }}
            >
              {profile.name?.[0]?.toUpperCase() || 'K'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white truncate">{profile.name}</h2>
            <p className="text-sm mt-0.5 truncate" style={{ color: T.sub }}>{profile.email}</p>
            {profile.phone && (
              <p className="text-sm" style={{ color: T.sub }}>{profile.phone}</p>
            )}
            {/* Status badge */}
            <span
              className="inline-block mt-2 text-xs font-bold tracking-[0.15em] px-2.5 py-1 rounded-full"
              style={isActive
                ? { backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }
                : { backgroundColor: 'rgba(255,255,255,0.06)', color: T.sub, border: `1px solid ${T.border}` }
              }
            >
              {isActive ? 'ACTIVE MEMBER' : (profile.subscription?.status?.toUpperCase() || 'INACTIVE')}
            </span>
          </div>
        </div>

        {/* ── Membership card ── */}
        {isActive && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-[0.1em] uppercase" style={{ color: T.sub }}>
                Membership Card
              </h2>
              <button
                onClick={() => navigate('/card')}
                className="flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: T.gold }}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Full Card
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <MembershipCard user={profile} />
          </div>
        )}

        {/* ── Account details ── */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
        >
          <h3 className="text-sm font-semibold tracking-[0.1em] uppercase mb-5" style={{ color: T.sub }}>
            Account Details
          </h3>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] mb-1" style={{ color: T.dim }}>Member ID</p>
              <p className="text-sm font-mono font-semibold text-white">{profile.membershipId || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.15em] mb-1" style={{ color: T.dim }}>Role</p>
              <p className="text-sm text-white capitalize">{profile.role}</p>
            </div>
            {profile.subscription?.startDate && (
              <div className="flex items-start gap-2">
                <CalendarDays className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.gold }} />
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] mb-1" style={{ color: T.dim }}>Member Since</p>
                  <p className="text-sm text-white">{format(new Date(profile.subscription.startDate), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            )}
            {profile.subscription?.endDate && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: T.gold }} />
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] mb-1" style={{ color: T.dim }}>Valid Until</p>
                  <p className="text-sm text-white">{format(new Date(profile.subscription.endDate), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Benefits ── */}
        {isActive && (
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: T.card, border: `1px solid rgba(245,158,11,0.12)` }}
          >
            <h3 className="text-sm font-semibold tracking-[0.1em] uppercase mb-5" style={{ color: T.sub }}>
              Membership Benefits
            </h3>
            <div className="space-y-3.5">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: T.gold }} />
                  </div>
                  <p className="text-sm text-white">{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Sign out ── */}
        {logout && (
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              backgroundColor: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171',
            }}
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
