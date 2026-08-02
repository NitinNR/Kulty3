import { useState, useRef, useEffect } from 'react';
import { Search, Menu, X, LogOut, MapPin, CalendarDays, Loader2 } from 'lucide-react';
import { logout } from '../../services/firebase';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getVenues, getEvents } from '../../services/api';

const NAV_LINKS = [
  { label: 'Venues',     href: '/home'      },
  { label: 'Events',     href: '/events'    },
  // { label: 'Saved',      href: '/favorites' },
  { label: 'History',    href: '/entries'   },
  { label: 'Membership', href: '/card'      },
  { label: 'Profile',    href: '/profile'   },
];

export const Navbar = () => {
  const [open, setOpen]  = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ venues: [], events: [] });
  const [searching, setSearching] = useState(false);
  const navigate          = useNavigate();
  const location          = useLocation();
  const { profile }       = useAuth();
  const isMember          = profile?.subscription?.status === 'active';

  const inputRef        = useRef(null);
  const searchPanelRef  = useRef(null);

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const q = query.trim();
    if (!q) {
      setResults({ venues: [], events: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const [vr, er] = await Promise.all([
          getVenues({ search: q, limit: 4 }),
          getEvents({ search: q, limit: 3 }),
        ]);
        setResults({
          venues: vr.data?.venues || [],
          events: er.data?.events || [],
        });
      } catch (_) {
        setResults({ venues: [], events: [] });
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, searchOpen]);

  useEffect(() => {
    setSearchOpen(false);
    setQuery('');
  }, [location.pathname]);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => {
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen]);

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
    setResults({ venues: [], events: [] });
  };

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    navigate(`/home?q=${encodeURIComponent(q)}&focus=1`);
  };

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
          <Link
            to="/home"
            className="flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0"
          >
            <span style={{ fontSize: '7px', color: 'rgba(245,158,11,0.45)', lineHeight: 1 }}>◆</span>
            <span
              className="font-display font-bold"
              style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)', letterSpacing: '0.08em' }}
            >
              Kulty
            </span>
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
            {/* Search icon — desktop + mobile */}
            <button
              onClick={() => setSearchOpen((s) => !s)}
              className="flex w-9 h-9 items-center justify-center rounded-full text-gray-500 hover:text-white transition"
              style={{ backgroundColor: searchOpen ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)' }}
              aria-label="Search"
            >
              <Search className="w-4 h-4" style={{ color: searchOpen ? '#f59e0b' : undefined }} />
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

        {/* ── Search panel ──────────────────────────────── */}
        {searchOpen && (
          <div className="px-0 pb-4 md:px-0" ref={searchPanelRef}>
            <div className="relative"
              style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', backgroundColor: '#141414' }}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#666' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSearch();
                  if (e.key === 'Escape') closeSearch();
                }}
                placeholder="Search venues, events, cities..."
                className="w-full pl-11 pr-10 py-3 text-sm text-white bg-transparent focus:outline-none placeholder-gray-600"
              />
              {searching ? (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#888' }} />
                </span>
              ) : query ? (
                <button onClick={closeSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#888' }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}

              {(results.venues.length > 0 || results.events.length > 0 || (query.trim() && !searching)) && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-2xl"
                  style={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {results.venues.length > 0 && (
                    <>
                      <p className="px-4 pt-3 pb-1 text-xs font-bold tracking-wider" style={{ color: '#888' }}>VENUES</p>
                      {results.venues.map((v) => (
                        <button key={v._id} onClick={() => navigate(`/venues/${v._id}`)}
                          className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition">
                          {v.images?.[0]
                            ? <img src={v.images[0]} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                            : <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1c1c1c' }}>
                                <MapPin className="w-4 h-4" style={{ color: '#666' }} />
                              </div>}
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{v.name}</p>
                            <p className="text-xs truncate" style={{ color: '#777' }}>
                              {[v.city, v.category].filter(Boolean).map((x) => String(x).toUpperCase()).join(' · ')}
                            </p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {results.events.length > 0 && (
                    <>
                      <p className="px-4 pt-3 pb-1 text-xs font-bold tracking-wider" style={{ color: '#888' }}>EVENTS</p>
                      {results.events.map((ev) => (
                        <button key={ev._id} onClick={() => navigate(`/events/${ev._id}`)}
                          className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition">
                          {ev.bannerImage
                            ? <img src={ev.bannerImage} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                            : <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1c1c1c' }}>
                                <CalendarDays className="w-4 h-4" style={{ color: '#666' }} />
                              </div>}
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{ev.title}</p>
                            <p className="text-xs truncate" style={{ color: '#777' }}>{ev.venueId?.name || 'Event'}</p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {results.venues.length === 0 && results.events.length === 0 && query.trim() && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-white font-medium mb-1">No results for "{query}"</p>
                      <p className="text-xs" style={{ color: '#777' }}>Try a different search</p>
                    </div>
                  )}
                  {query.trim() && (
                    <button onClick={submitSearch}
                      className="w-full text-left px-4 py-3 text-sm font-semibold transition hover:bg-white/5"
                      style={{ color: '#f59e0b', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      See all results for "{query.trim()}" →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
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
