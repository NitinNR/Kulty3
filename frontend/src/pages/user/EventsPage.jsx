import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Ticket, Search, X } from 'lucide-react';
import { getEvents } from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { Spinner } from '../../components/common/Spinner';

const T = {
  bg:       '#0d0d0d',
  card:     '#141414',
  cardLite: '#1c1c1c',
  border:   'rgba(255,255,255,0.07)',
  sub:      '#888',
  dim:      '#555',
  gold:     '#f59e0b',
};

const FILTERS = [
  { value: '',         label: 'All Events'  },
  { value: 'upcoming', label: 'Upcoming'    },
  { value: 'ongoing',  label: 'Live Now'    },
  { value: 'past',     label: 'Past'        },
];

const STATUS_STYLE = {
  upcoming: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',  label: 'Upcoming' },
  ongoing:  { bg: 'rgba(34,197,94,0.12)',   color: '#4ade80',  label: 'Live Now' },
  past:     { bg: 'rgba(255,255,255,0.06)', color: '#555',     label: 'Past'     },
};

const EventCard = ({ event, onClick }) => {
  const status = STATUS_STYLE[event.status] || STATUS_STYLE.upcoming;
  const venue  = event.venueId;
  const isFree = !event.ticketPrice || event.ticketPrice === 0;

  const dateStr = event.date
    ? new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div
      onClick={onClick}
      className="rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 hover:-translate-y-0.5"
      style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
    >
      {/* Banner */}
      <div className="relative overflow-hidden" style={{ height: '180px' }}>
        {event.bannerImage ? (
          <img
            src={event.bannerImage}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1c1408 0%, #0d0d0d 60%, #1a1204 100%)' }}
          >
            <span className="text-5xl opacity-20 select-none">🎉</span>
          </div>
        )}

        <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: status.bg, color: status.color }}>
          {status.label}
        </span>

        <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: isFree ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.6)',
            color: isFree ? '#4ade80' : '#fff',
            backdropFilter: 'blur(4px)',
          }}>
          {isFree ? 'FREE' : `₹${event.ticketPrice}`}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm leading-snug mb-2 line-clamp-2">
          {event.title}
        </h3>

        {/* Venue */}
        {venue?.name && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: T.dim }} />
            <span className="text-xs truncate" style={{ color: T.sub }}>
              {venue.name}{venue.city ? `, ${venue.city}` : ''}
            </span>
          </div>
        )}

        {/* Date + time */}
        <div className="flex items-center gap-4">
          {dateStr && (
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-3 h-3 flex-shrink-0" style={{ color: T.gold }} />
              <span className="text-xs" style={{ color: T.sub }}>{dateStr}</span>
            </div>
          )}
          {event.time && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 flex-shrink-0" style={{ color: T.gold }} />
              <span className="text-xs" style={{ color: T.sub }}>{event.time}</span>
            </div>
          )}
        </div>

        {event.capacity && (
          <div className="flex items-center gap-1.5 mt-2">
            <Ticket className="w-3 h-3 flex-shrink-0" style={{ color: T.dim }} />
            <span className="text-xs" style={{ color: T.dim }}>{event.capacity} spots</span>
          </div>
        )}
      </div>
    </div>
  );
};

const EVENT_LIMIT = 12;

export const EventsPage = () => {
  const navigate = useNavigate();
  const [events,      setEvents]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [evtPage,     setEvtPage]     = useState(1);
  const [filter,      setFilter]      = useState('');
  const [search,      setSearch]      = useState('');
  const sentinelRef = useRef(null);

  const fetchEvents = useCallback(async (pg, append = false) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params = { page: pg, limit: EVENT_LIMIT };
      if (filter) params.status = filter;
      if (search) params.search = search;
      const res = await getEvents(params);
      const fetched = res.data?.events || [];
      const total   = res.data?.total  || 0;
      setEvents((prev) => append ? [...prev, ...fetched] : fetched);
      setHasMore(pg * EVENT_LIMIT < total);
      setEvtPage(pg);
    } catch (err) {
      console.error(err);
    } finally {
      if (pg === 1) setLoading(false); else setLoadingMore(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(() => fetchEvents(1, false), search ? 400 : 0);
    return () => clearTimeout(t);
  }, [filter, search]);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchEvents(evtPage + 1, true); },
      { rootMargin: '300px' }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, evtPage, fetchEvents]);

  const hasFilters = filter || search;

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ backgroundColor: T.bg }}>
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-8">

        {/* Header */}
        <div className="mb-7">
          <h1
            className="font-display font-bold text-white mb-1"
            style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)' }}
          >
            Events
          </h1>
          <p className="text-sm" style={{ color: T.sub }}>
            Exclusive experiences curated for Kulty members
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-5"
          style={{ border: `1px solid rgba(255,255,255,0.1)`, borderRadius: '14px' }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: T.dim }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by event name, venue or city..."
            className="w-full pl-11 pr-10 py-3.5 text-sm text-white bg-transparent focus:outline-none placeholder-gray-600"
            style={{ borderRadius: '14px' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: T.sub }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 mb-8">
          {FILTERS.map(({ value, label }) => {
            const active = filter === value;
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className="px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200"
                style={
                  active
                    ? { backgroundColor: T.gold, color: '#000' }
                    : { backgroundColor: T.cardLite, color: T.sub, border: `1px solid ${T.border}` }
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : events.length === 0 ? (
          <div
            className="text-center py-20 rounded-2xl"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
          >
            <p className="text-4xl mb-4">📅</p>
            <p className="text-white font-semibold mb-1">No events found</p>
            <p className="text-sm mb-5" style={{ color: T.sub }}>
              {hasFilters ? 'Try a different search or filter' : 'Check back soon for upcoming events'}
            </p>
            {hasFilters && (
              <button
                onClick={() => { setFilter(''); setSearch(''); }}
                className="text-sm font-semibold"
                style={{ color: T.gold }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-sm font-semibold text-white">{events.length} event{events.length !== 1 ? 's' : ''}</span>
              {(search || filter) && (
                <span className="text-sm" style={{ color: T.dim }}>
                  {search ? `— "${search}"` : `— ${FILTERS.find((f) => f.value === filter)?.label}`}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
              {events.map((event) => (
                <EventCard
                  key={event._id}
                  event={event}
                  onClick={() => navigate(`/events/${event._id}`)}
                />
              ))}
            </div>
            <div ref={sentinelRef} className="h-1" />
            {loadingMore && (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{ borderColor: `${T.gold} transparent transparent transparent` }} />
              </div>
            )}
            {!hasMore && events.length > 0 && (
              <p className="text-center text-xs pb-10" style={{ color: T.dim }}>All events loaded</p>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
