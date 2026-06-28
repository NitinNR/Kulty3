import { useState, useEffect } from 'react';
import { Search, MapPin, ChevronRight, CreditCard, TrendingUp, Star } from 'lucide-react';
import { getVenues, getEvents } from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { Spinner } from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
  { label: 'All',        emoji: '✨', value: 'all'        },
  { label: 'Restaurant', emoji: '🍽️', value: 'restaurant' },
  { label: 'Club',       emoji: '🎵', value: 'club'       },
  { label: 'Spa',        emoji: '💆', value: 'spa'        },
  { label: 'Café',       emoji: '☕', value: 'cafe'       },
  { label: 'Lounge',     emoji: '🛋️', value: 'lounge'    },
  { label: 'Bar',        emoji: '🍸', value: 'bar'        },
];

const GRADIENTS = {
  restaurant: 'from-orange-400 to-amber-500',
  club:       'from-violet-500 to-purple-700',
  spa:        'from-emerald-400 to-teal-600',
  cafe:       'from-amber-400 to-orange-400',
  lounge:     'from-indigo-500 to-blue-700',
  bar:        'from-rose-500 to-red-700',
  other:      'from-gray-500 to-gray-700',
};

const CATEGORY_EMOJI = {
  restaurant: '🍽️',
  club:       '🎵',
  spa:        '💆',
  cafe:       '☕',
  lounge:     '🛋️',
  bar:        '🍸',
  other:      '🏢',
};

const VenueCard = ({ venue, onClick }) => {
  const cat = venue.category?.toLowerCase() || 'other';
  const gradient = GRADIENTS[cat] || GRADIENTS.other;
  const emoji = CATEGORY_EMOJI[cat] || '🏢';

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-1"
    >
      {/* Cover */}
      <div className={`relative h-48 ${venue.images?.[0] ? '' : `bg-gradient-to-br ${gradient}`}`}>
        {venue.images?.[0] ? (
          <img
            src={venue.images[0]}
            alt={venue.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <span className="text-5xl mb-2">{emoji}</span>
          </div>
        )}

        {/* Cashback badge — top right */}
        {venue.cashbackPercentage > 0 && (
          <div className="absolute top-3 right-3 bg-white text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {venue.cashbackPercentage}% back
          </div>
        )}

        {/* Category chip — bottom left */}
        <div className="absolute bottom-3 left-3 bg-black bg-opacity-40 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full capitalize">
          {venue.category || 'venue'}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base leading-snug mb-1 group-hover:text-gray-700 transition">
          {venue.name}
        </h3>
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <MapPin className="w-3 h-3" />
          <span>{venue.city || 'Location TBD'}</span>
        </div>
        {venue.description && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
            {venue.description}
          </p>
        )}
      </div>
    </div>
  );
};

const EventCard = ({ event, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex gap-4 p-4"
  >
    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center flex-shrink-0">
      <span className="text-2xl">🎉</span>
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-semibold text-gray-900 text-sm truncate">{event.title}</h4>
      {event.date && (
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>
      )}
      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{event.description}</p>
    </div>
    {event.ticketPrice > 0 && (
      <div className="flex-shrink-0 text-right">
        <span className="text-sm font-bold text-gray-900">₹{event.ticketPrice}</span>
      </div>
    )}
  </div>
);

export const HomePage = () => {
  const [venues, setVenues]     = useState([]);
  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('all');
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const [venuesRes, eventsRes] = await Promise.all([
          getVenues({ search, category: category === 'all' ? '' : category }),
          getEvents({ limit: 4 }),
        ]);
        if (!active) return;
        setVenues(venuesRes.data?.venues || venuesRes.data || []);
        setEvents(eventsRes.data?.events || eventsRes.data || []);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        if (active) setLoading(false);
      }
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [search, category]);

  const firstName = profile?.name?.split(' ')[0] || 'Member';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-4 pt-8 pb-6">

          {/* Greeting */}
          <div className="mb-5">
            <p className="text-amber-400 text-sm font-medium mb-0.5">Welcome back 👋</p>
            <h1 className="text-3xl font-display font-bold text-white">{firstName}</h1>
          </div>

          {/* Membership quick-access */}
          {profile?.subscription?.status === 'active' && (
            <button
              onClick={() => navigate('/card')}
              className="w-full flex items-center justify-between bg-white bg-opacity-10 hover:bg-opacity-15 border border-white border-opacity-10 rounded-xl px-4 py-3 mb-5 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-400 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-gray-900" />
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-semibold">My Membership Card</p>
                  <p className="text-gray-400 text-xs">{profile?.membershipId || 'View QR code'}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white transition" />
            </button>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search venues, cities..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white bg-opacity-10 border border-white border-opacity-10 text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-opacity-15 transition"
            />
          </div>
        </div>

        {/* Category pills */}
        <div className="border-t border-white border-opacity-10">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto py-3 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition flex-shrink-0 ${
                    category === cat.value
                      ? 'bg-amber-400 text-gray-900'
                      : 'bg-white bg-opacity-10 text-gray-300 hover:bg-opacity-20'
                  }`}
                >
                  <span className="text-base leading-none">{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <>
            {/* Venues section */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-display font-bold text-gray-900">
                {search
                  ? `Results for "${search}"`
                  : category !== 'all'
                  ? `${CATEGORIES.find((c) => c.value === category)?.label} Venues`
                  : 'Featured Venues'}
              </h2>
              {venues.length > 0 && (
                <span className="text-sm text-gray-400">{venues.length} found</span>
              )}
            </div>

            {venues.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-gray-500 font-medium">No venues found</p>
                <p className="text-gray-400 text-sm mt-1">Try a different search or category</p>
                <button
                  onClick={() => { setSearch(''); setCategory('all'); }}
                  className="mt-4 text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
                {venues.map((venue) => (
                  <VenueCard
                    key={venue._id}
                    venue={venue}
                    onClick={() => navigate(`/venues/${venue._id}`)}
                  />
                ))}
              </div>
            )}

            {/* Events section */}
            {events.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-display font-bold text-gray-900">Upcoming Events</h2>
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {events.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {events.map((event) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      onClick={() => navigate(`/events/${event._id}`)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
