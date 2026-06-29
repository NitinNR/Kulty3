import { useState, useEffect } from 'react';
import {
  Search, MapPin, Star, Heart, ChevronRight,
  LayoutGrid, Utensils, Music, Leaf, Coffee, Wine, GlassWater,
  Compass, Camera, AtSign, CreditCard, CalendarDays,
} from 'lucide-react';
import { getVenues, getEvents } from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { Spinner } from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:       '#0d0d0d',
  card:     '#141414',
  cardLite: '#1c1c1c',
  border:   'rgba(255,255,255,0.07)',
  sub:      '#888',
  dim:      '#555',
  gold:     '#f59e0b',
};

// ─── Category config ──────────────────────────────────────────────────────────
const CATS = [
  { value: 'all',        label: 'All',        Icon: LayoutGrid   },
  { value: 'restaurant', label: 'Restaurant', Icon: Utensils     },
  { value: 'club',       label: 'Club',       Icon: Music        },
  { value: 'spa',        label: 'Spa',        Icon: Leaf         },
  { value: 'cafe',       label: 'Café',       Icon: Coffee       },
  { value: 'lounge',     label: 'Lounge',     Icon: Wine         },
  { value: 'bar',        label: 'Bar',        Icon: GlassWater   },
];

const CAT_META = {
  restaurant: { gradient: 'from-orange-500 to-amber-600',    tags: ['Fine Dining', 'Global Cuisine'], atmo: '🍽️' },
  club:       { gradient: 'from-violet-600 to-purple-800',   tags: ['Nightlife', 'DJ Sets'],          atmo: '🎵' },
  spa:        { gradient: 'from-emerald-500 to-teal-700',    tags: ['Wellness', 'Relaxation'],        atmo: '💆' },
  cafe:       { gradient: 'from-amber-400 to-orange-500',    tags: ['Coffee', 'Brunch'],              atmo: '☕' },
  lounge:     { gradient: 'from-indigo-500 to-blue-800',     tags: ['Cocktails', 'Live Music'],       atmo: '🛋️' },
  bar:        { gradient: 'from-rose-600 to-red-800',        tags: ['Craft Beer', 'Whiskey'],         atmo: '🍸' },
  other:      { gradient: 'from-gray-600 to-gray-800',       tags: ['Premium', 'Exclusive'],          atmo: '✨' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const stableNum = (s = '', mod = 10, min = 0) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return min + Math.abs(h) % mod;
};
const stableRating  = (s) => (4.1 + stableNum(s, 9) / 10).toFixed(1);
const stablePrice   = (s) => Math.max(1, Math.min(4, 1 + stableNum(s, 4)));

// ─── Venue Card ───────────────────────────────────────────────────────────────
const VenueCard = ({ venue, onClick }) => {
  const [liked, setLiked] = useState(false);
  const cat     = venue.category?.toLowerCase() || 'other';
  const meta    = CAT_META[cat] || CAT_META.other;
  const CatIcon = CATS.find((c) => c.value === cat)?.Icon || LayoutGrid;
  const rating  = stableRating(venue.name);
  const price   = '₹'.repeat(stablePrice(venue.name));
  // Use real amenities if set; otherwise nothing (no static filler tags)
  const tags    = venue.amenities?.filter(Boolean).slice(0, 2) || [];

  return (
    <div
      onClick={onClick}
      className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-0.5"
      style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
    >
      {/* Cover image / gradient */}
      <div className="relative overflow-hidden" style={{ height: '200px' }}>
        {venue.images?.[0] ? (
          <img
            src={venue.images[0]}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
            <span className="text-6xl opacity-30 select-none">{meta.atmo}</span>
          </div>
        )}

        {/* Cashback badge — top left */}
        {venue.cashbackPercentage > 0 && (
          <div
            className="absolute top-3 left-3 flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: T.gold, color: '#000' }}
          >
            {venue.cashbackPercentage}% BACK
          </div>
        )}
        {!venue.cashbackPercentage && (
          <div
            className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(139,92,246,0.9)', color: '#fff' }}
          >
            MEMBER EXCLUSIVE
          </div>
        )}

        {/* Wishlist heart — top right */}
        <button
          onClick={(e) => { e.stopPropagation(); setLiked((l) => !l); }}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
        >
          <Heart className={`w-4 h-4 transition ${liked ? 'fill-red-400 text-red-400' : 'text-white'}`} />
        </button>

        {/* Category chip — bottom left */}
        <div
          className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', color: '#ddd' }}
        >
          <CatIcon className="w-3 h-3" />
          {(venue.category || 'venue').toUpperCase()}
        </div>
      </div>

      {/* Info section */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-white font-semibold text-sm leading-snug flex-1 line-clamp-1">
            {venue.name}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-white text-xs font-semibold">{rating}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-3">
          <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: T.dim }} />
          <span className="text-xs truncate" style={{ color: T.sub }}>
            {venue.city || 'Mumbai'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs">
            <span style={{ color: T.gold }}>{price}</span>
            {tags.length > 0 && (
              <span style={{ color: T.dim }}> · {tags.join(', ')}</span>
            )}
          </p>
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: T.cardLite }}
          >
            <ChevronRight className="w-3.5 h-3.5" style={{ color: '#666' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Membership summary widget ────────────────────────────────────────────────
const MembershipSummary = ({ profile, venueCount, onCardClick, onEventsClick }) => {
  const start = profile?.subscription?.startDate ? new Date(profile.subscription.startDate) : null;
  const end   = profile?.subscription?.endDate   ? new Date(profile.subscription.endDate)   : null;
  const progress = (start && end)
    ? Math.min(100, Math.max(0, Math.round(((Date.now() - start) / (end - start)) * 100)))
    : 0;
  const monthsLeft = (end && end > Date.now())
    ? Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  const fmtDate = (d) => d
    ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
    >
      {/* Top bar */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${T.border}` }}
      >
        <div>
          <p className="text-xs font-bold tracking-[0.18em] uppercase" style={{ color: T.gold }}>
            Gold Elite
          </p>
          <p className="text-white font-semibold text-sm mt-0.5 truncate max-w-[160px]">
            {profile?.name || 'Member'}
          </p>
        </div>
        <span
          className="text-xs font-bold tracking-[0.12em] px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          ACTIVE
        </span>
      </div>

      {/* Dates row */}
      <div className="grid grid-cols-2 divide-x px-0" style={{ borderBottom: `1px solid ${T.border}` }}>
        {[{ label: 'Member Since', val: fmtDate(start) }, { label: 'Valid Until', val: fmtDate(end) }].map(({ label, val }) => (
          <div key={label} className="px-5 py-3.5" style={{ borderColor: T.border }}>
            <p className="text-xs uppercase tracking-[0.12em] mb-1" style={{ color: T.dim }}>{label}</p>
            <p className="text-sm font-semibold text-white">{val}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs" style={{ color: T.sub }}>Membership Progress</p>
          <p className="text-xs font-semibold" style={{ color: monthsLeft > 3 ? T.gold : '#f87171' }}>
            {monthsLeft > 0 ? `${monthsLeft}mo left` : 'Expired'}
          </p>
        </div>
        <div className="w-full rounded-full overflow-hidden" style={{ height: '4px', backgroundColor: T.cardLite }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, backgroundColor: progress > 85 ? '#f87171' : T.gold }}
          />
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <button
          onClick={onCardClick}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-80"
          style={{ backgroundColor: T.gold, color: '#0d0d0d' }}
        >
          <CreditCard className="w-4 h-4" /> My Card
        </button>
        <button
          onClick={onEventsClick}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-80"
          style={{ backgroundColor: T.cardLite, color: 'rgba(255,255,255,0.8)', border: `1px solid ${T.border}` }}
        >
          <CalendarDays className="w-4 h-4" /> Events
        </button>
      </div>

      {/* Footer */}
      {venueCount > 0 && (
        <p className="text-center text-xs pb-4" style={{ color: T.dim }}>
          {venueCount} partner venue{venueCount !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  );
};

// ─── Footer (desktop only) ────────────────────────────────────────────────────
const FOOTER_COLS = [
  {
    heading: 'Discover',
    links: ['Venues near me', 'New openings', 'Curated lists', 'Trending cities'],
  },
  {
    heading: 'Company',
    links: ['About Kulty', 'Partner with us', 'Careers', 'Press kit'],
  },
  {
    heading: 'Support',
    links: ['Help Center', 'Safety center', 'Terms of service', 'Privacy policy'],
  },
];

const Footer = () => (
  <footer className="mt-16 pb-8 hidden md:block" style={{ borderTop: `1px solid ${T.border}` }}>
    <div className="pt-12 grid grid-cols-4 gap-10 mb-10">
      <div>
        <p className="text-accent-500 font-display font-bold text-xl mb-3">Kulty</p>
        <p className="text-sm leading-relaxed" style={{ color: T.dim }}>
          Connecting elite members with the world's most curated hospitality experiences.
        </p>
      </div>
      {FOOTER_COLS.map(({ heading, links }) => (
        <div key={heading}>
          <h4 className="text-white text-sm font-semibold mb-4">{heading}</h4>
          {links.map((l) => (
            <p key={l} className="text-sm mb-3 cursor-pointer hover:text-white transition"
              style={{ color: T.dim }}>
              {l}
            </p>
          ))}
        </div>
      ))}
    </div>
    <div
      className="flex items-center justify-between pt-5"
      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
    >
      <p className="text-xs" style={{ color: '#333' }}>
        © 2024 Kulty Premium Discovery. All rights reserved.
      </p>
      <div className="flex items-center gap-2">
        {[Compass, GlassWater, Camera, AtSign].map((Icon, i) => (
          <button
            key={i}
            className="w-8 h-8 flex items-center justify-center rounded-full transition hover:opacity-80"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            <Icon className="w-4 h-4" style={{ color: T.dim }} />
          </button>
        ))}
      </div>
    </div>
  </footer>
);

// ─── Main component ───────────────────────────────────────────────────────────
export const HomePage = () => {
  const [venues,    setVenues]    = useState([]);
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [category,  setCategory]  = useState('all');
const navigate                  = useNavigate();
  const { profile }               = useAuth();

  const isMember   = profile?.subscription?.status === 'active';
  const firstName  = profile?.name?.split(' ')[0] || 'Member';

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const [vr, er] = await Promise.all([
          getVenues({ search, category: category === 'all' ? '' : category }),
          getEvents({ limit: 4 }),
        ]);
        if (!active) return;
        setVenues(vr.data?.venues || vr.data || []);
        setEvents(er.data?.events || er.data || []);
      } catch (err) {
        console.error('Home load failed:', err);
      } finally {
        if (active) setLoading(false);
      }
    }, 400);
    return () => { active = false; clearTimeout(t); };
  }, [search, category]);

  const activeCat = CATS.find((c) => c.value === category);

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ backgroundColor: T.bg }}>
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8">

        {/* ════════════════════════════════════════════════════
            TOP ROW — greeting (left) + membership card (right)
        ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* ── Left: greeting + search ── */}
          <div className="lg:col-span-2">
            {/* Greeting — mobile style */}
            <div className="mb-6 md:hidden">
              <p className="text-xs font-bold tracking-[0.25em] uppercase mb-1" style={{ color: T.gold }}>
                WELCOME BACK
              </p>
              <h1 className="text-4xl font-display font-bold text-white">{firstName}</h1>
            </div>

            {/* Greeting — desktop style */}
            <div className="mb-4 hidden md:block">
              <h1 className="text-4xl font-display font-bold text-white mb-1.5">
                Welcome back, <span className="lowercase">{firstName}</span>
              </h1>
              <p className="text-base" style={{ color: T.sub }}>
                Explore the city's most exclusive venues curated just for you.
              </p>
            </div>

            {/* Search bar */}
            <div
              className="relative mb-6"
              style={{ border: `1px solid rgba(255,255,255,0.1)`, borderRadius: '14px' }}
            >
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                style={{ color: T.dim }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search venues and cities..."
                className="w-full pl-11 pr-4 py-3.5 text-sm text-white bg-transparent focus:outline-none placeholder-gray-600"
                style={{ borderRadius: '14px' }}
              />
            </div>

            {/* Membership summary — mobile inline */}
            {isMember && (
              <div className="mb-6 lg:hidden">
                <MembershipSummary
                  profile={profile}
                  venueCount={venues.length}
                  onCardClick={() => navigate('/card')}
                  onEventsClick={() => navigate('/events')}
                />
              </div>
            )}
          </div>

          {/* ── Right: membership summary — desktop only ── */}
          {isMember ? (
            <div className="hidden lg:block">
              <MembershipSummary
                profile={profile}
                venueCount={venues.length}
                onCardClick={() => navigate('/card')}
                onEventsClick={() => navigate('/events')}
              />
            </div>
          ) : (
            <div className="hidden lg:flex items-center">
              <div className="w-full rounded-2xl p-6 text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <p className="text-3xl mb-3">🏆</p>
                <p className="text-white font-semibold mb-1">Unlock Full Access</p>
                <p className="text-sm mb-4" style={{ color: T.sub }}>Join as a Kulty member for exclusive perks</p>
                <button
                  onClick={() => navigate('/payment')}
                  className="w-full py-2.5 rounded-xl font-bold text-sm transition hover:opacity-90"
                  style={{ backgroundColor: T.gold, color: '#000' }}
                >
                  Activate — ₹999/yr
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════
            CATEGORY PILLS
        ════════════════════════════════════════════════════ */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 mb-8">
          {CATS.map(({ value, label, Icon }) => {
            const active = category === value;
            return (
              <button
                key={value}
                onClick={() => setCategory(value)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200"
                style={
                  active
                    ? { backgroundColor: T.gold, color: '#000' }
                    : { backgroundColor: T.cardLite, color: T.sub, border: `1px solid ${T.border}` }
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════════════
            FEATURED VENUES
        ════════════════════════════════════════════════════ */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <h2 className="text-xl font-display font-bold text-white">
              {search
                ? `Results for "${search}"`
                : `${activeCat?.label === 'All' ? 'Featured' : activeCat?.label} Venues`}
            </h2>
            {!search && (
              <p className="text-xs mt-0.5" style={{ color: T.dim }}>
                Handpicked experiences for your lifestyle
              </p>
            )}
          </div>
          {venues.length > 0 && (
            <button
              className="text-sm font-semibold flex items-center gap-1 transition hover:opacity-70 flex-shrink-0 ml-4"
              style={{ color: T.gold }}
            >
              View all <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : venues.length === 0 ? (
          <div
            className="text-center py-16 rounded-2xl my-6"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
          >
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-white font-semibold mb-1">No venues found</p>
            <p className="text-sm mb-4" style={{ color: T.sub }}>Try a different search or category</p>
            <button
              onClick={() => { setSearch(''); setCategory('all'); }}
              className="text-sm font-semibold transition hover:opacity-70"
              style={{ color: T.gold }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5 mb-12">
            {venues.map((venue) => (
              <VenueCard
                key={venue._id}
                venue={venue}
                onClick={() => navigate(`/venues/${venue._id}`)}
              />
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            EVENTS (if any)
        ════════════════════════════════════════════════════ */}
        {events.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-5">
              <h2 className="text-xl font-display font-bold text-white">Upcoming Events</h2>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: T.gold }}
              >
                {events.length}
              </span>
            </div>
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event._id}
                  className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:opacity-80 transition"
                  style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
                  onClick={() => navigate(`/events/${event._id}`)}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: T.cardLite }}
                  >
                    <span className="text-2xl">🎉</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{event.title}</p>
                    {event.date && (
                      <p className="text-xs mt-0.5" style={{ color: T.sub }}>
                        {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {event.ticketPrice > 0 && (
                    <p className="text-white font-bold text-sm flex-shrink-0">₹{event.ticketPrice}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════
            FOOTER (desktop only)
        ════════════════════════════════════════════════════ */}
        <Footer />
      </div>

      <BottomNav />
    </div>
  );
};
