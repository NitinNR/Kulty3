import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { MembershipCard } from '../../components/card/MembershipCard';
import { format } from 'date-fns';
import { CreditCard, LogOut, CalendarDays, Clock, ChevronRight } from 'lucide-react';

const T = {
  bg:       '#0d0d0d',
  card:     '#141414',
  border:   'rgba(255,255,255,0.07)',
  sub:      'rgba(255,255,255,0.55)',
  dim:      'rgba(255,255,255,0.22)',
  gold:     '#f59e0b',
};

export const ProfilePage = () => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  const isActive = profile.subscription?.status === 'active';

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0" style={{ backgroundColor: T.bg }}>
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">

        {/* ── Profile header ── */}
        <div
          className="flex items-center gap-4 rounded-2xl p-5 mb-5"
          style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
        >
          {profile.profilePhoto ? (
            <img
              src={profile.profilePhoto}
              alt={profile.name}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              style={{ border: '2px solid rgba(245,158,11,0.35)' }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: T.gold, border: '2px solid rgba(245,158,11,0.25)' }}
            >
              {profile.name?.[0]?.toUpperCase() || 'K'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{profile.name}</h2>
            <p className="text-sm truncate" style={{ color: T.sub }}>{profile.email}</p>
            {profile.phone && <p className="text-sm" style={{ color: T.sub }}>{profile.phone}</p>}
          </div>

          <span
            className="text-xs font-bold tracking-[0.12em] px-2.5 py-1 rounded-full flex-shrink-0"
            style={isActive
              ? { backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }
              : { backgroundColor: 'rgba(255,255,255,0.05)', color: T.sub, border: `1px solid ${T.border}` }
            }
          >
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>

        {/* ── Membership card ── */}
        {isActive && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: T.dim }}>
                Membership Card
              </p>
              <button
                onClick={() => navigate('/card')}
                className="flex items-center gap-1 text-xs font-medium transition hover:opacity-70"
                style={{ color: T.gold }}
              >
                <CreditCard className="w-3.5 h-3.5" />
                Full view
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <MembershipCard user={profile} />
          </div>
        )}

        {/* ── Subscription info strip ── */}
        {isActive && (
          <div
            className="flex items-center divide-x rounded-2xl overflow-hidden mb-5"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, divideColor: T.border }}
          >
            <div className="flex-1 flex items-center gap-3 px-4 py-4" style={{ borderRight: `1px solid ${T.border}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                <CalendarDays className="w-4 h-4" style={{ color: T.gold }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] mb-0.5" style={{ color: T.dim }}>Since</p>
                <p className="text-sm font-semibold text-white">
                  {profile.subscription?.startDate
                    ? format(new Date(profile.subscription.startDate), 'MMM yyyy')
                    : '—'}
                </p>
              </div>
            </div>

            <div className="flex-1 flex items-center gap-3 px-4 py-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                <Clock className="w-4 h-4" style={{ color: T.gold }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] mb-0.5" style={{ color: T.dim }}>Expires</p>
                <p className="text-sm font-semibold text-white">
                  {profile.subscription?.endDate
                    ? format(new Date(profile.subscription.endDate), 'MMM yyyy')
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Member ID row ── */}
        {profile.membershipId && (
          <div
            className="flex items-center justify-between rounded-2xl px-5 py-4 mb-5"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
          >
            <p className="text-xs uppercase tracking-[0.12em]" style={{ color: T.dim }}>Member ID</p>
            <p className="text-sm font-mono font-semibold text-white tracking-widest">
              {profile.membershipId}
            </p>
          </div>
        )}

        {/* ── Sign out ── */}
        {logout && (
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium transition hover:opacity-80"
            style={{
              backgroundColor: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.18)',
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
