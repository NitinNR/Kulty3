import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, Clock, MapPin, Users,
  Ticket, ChevronRight, CheckCircle, X,
} from 'lucide-react';
import { getEvent, getEvents, registerEvent, unregisterEvent } from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { Spinner } from '../../components/common/Spinner';

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

const STATUS_META = {
  upcoming: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Upcoming'  },
  ongoing:  { color: '#4ade80', bg: 'rgba(34,197,94,0.12)',  label: 'Live Now'  },
  past:     { color: '#555',    bg: 'rgba(255,255,255,0.06)',label: 'Past Event' },
};

const CAT_GRADIENT = {
  restaurant: 'from-orange-500 to-amber-600',
  club:       'from-violet-600 to-purple-800',
  spa:        'from-emerald-500 to-teal-700',
  cafe:       'from-amber-400 to-orange-500',
  lounge:     'from-indigo-500 to-blue-800',
  bar:        'from-rose-600 to-red-800',
  other:      'from-gray-600 to-gray-800',
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  : null;

// ─── Compact "more events" card ───────────────────────────────────────────────
const MiniEventCard = ({ event, onClick }) => {
  const isFree = !event.ticketPrice || event.ticketPrice === 0;
  const sDate  = event.date ? new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
  const grad   = CAT_GRADIENT[event.venueId?.category?.toLowerCase()] || CAT_GRADIENT.other;

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-52 rounded-2xl overflow-hidden cursor-pointer group"
      style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
    >
      <div className="relative overflow-hidden h-32">
        {event.bannerImage ? (
          <img src={event.bannerImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
            <span className="text-3xl opacity-25 select-none">🎉</span>
          </div>
        )}
        <span
          className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: isFree ? 'rgba(34,197,94,0.25)' : 'rgba(0,0,0,0.65)', color: isFree ? '#4ade80' : '#fff', backdropFilter: 'blur(4px)' }}
        >
          {isFree ? 'FREE' : `₹${event.ticketPrice}`}
        </span>
      </div>
      <div className="p-3">
        <p className="text-white text-sm font-semibold leading-snug line-clamp-2 mb-1.5">{event.title}</p>
        {sDate && (
          <div className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3 flex-shrink-0" style={{ color: T.gold }} />
            <span className="text-xs" style={{ color: T.sub }}>{sDate}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const EventDetailPage = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();

  const [event,         setEvent]         = useState(null);
  const [moreEvents,    setMoreEvents]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [isRegistered,  setIsRegistered]  = useState(false);
  const [regCount,      setRegCount]      = useState(0);
  const [regLoading,    setRegLoading]    = useState(false);
  const [regError,      setRegError]      = useState('');
  const [showCancel,    setShowCancel]    = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    getEvent(id)
      .then((res) => {
        const ev = res.data;
        setEvent(ev);
        setIsRegistered(ev.isRegistered || false);
        setRegCount(ev.registrationCount || 0);
        // Fetch more events from same venue
        if (ev.venueId?._id) {
          getEvents({ venueId: ev.venueId._id, limit: 8 })
            .then((r) => {
              const list = (r.data?.events || []).filter((e) => e._id !== id);
              setMoreEvents(list.slice(0, 6));
            })
            .catch(() => {});
        }
      })
      .catch(() => setError('Event not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRegister = async () => {
    setRegLoading(true);
    setRegError('');
    try {
      const res = await registerEvent(id);
      setIsRegistered(true);
      setRegCount(res.data.registrationCount);
    } catch (err) {
      setRegError(err.response?.data?.error || 'Could not register. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleUnregister = async () => {
    setRegLoading(true);
    setRegError('');
    setShowCancel(false);
    try {
      const res = await unregisterEvent(id);
      setIsRegistered(false);
      setRegCount(res.data.registrationCount);
    } catch (err) {
      setRegError(err.response?.data?.error || 'Could not cancel. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: T.bg }}>
        <Navbar />
        {/* Hero skeleton */}
        <div className="w-full animate-pulse" style={{ height: 'clamp(320px, 45vw, 480px)', backgroundColor: '#1a1a1a' }} />
        {/* Content skeleton */}
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-3">
                <div className="h-6 w-44 rounded-xl animate-pulse" style={{ backgroundColor: '#1c1c1c' }} />
                {[100, 88, 72].map((w) => (
                  <div key={w} className="h-4 rounded-xl animate-pulse" style={{ width: `${w}%`, backgroundColor: '#1c1c1c' }} />
                ))}
              </div>
              <div className="rounded-2xl p-5 space-y-4 animate-pulse" style={{ backgroundColor: '#141414' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl flex-shrink-0" style={{ backgroundColor: '#1c1c1c' }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-16 rounded" style={{ backgroundColor: '#1c1c1c' }} />
                      <div className="h-4 w-40 rounded" style={{ backgroundColor: '#1c1c1c' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-5 animate-pulse" style={{ backgroundColor: '#141414', height: '220px' }} />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }
  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: T.bg }}>
        <p className="text-5xl mb-4">😕</p>
        <p className="text-white font-semibold mb-3">{error || 'Event not found'}</p>
        <button onClick={() => navigate('/events')} className="text-sm" style={{ color: T.gold }}>
          ← Back to events
        </button>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const venue    = event.venueId;
  const statusM  = STATUS_META[event.status] || STATUS_META.upcoming;
  const isPast   = event.status === 'past';
  const isFree   = !event.ticketPrice || event.ticketPrice === 0;
  const isFull   = event.capacity && regCount >= event.capacity;
  const capPct   = event.capacity ? Math.min(100, Math.round((regCount / event.capacity) * 100)) : 0;
  const grad     = CAT_GRADIENT[venue?.category?.toLowerCase()] || CAT_GRADIENT.other;

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ backgroundColor: T.bg }}>
      <Navbar />

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <div className="relative" style={{ height: 'clamp(320px, 45vw, 480px)' }}>

        {event.bannerImage ? (
          <img src={event.bannerImage} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
        )}

        {/* Cinematic overlay */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0.6) 65%, rgba(13,13,13,1) 100%)' }} />

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 text-white text-sm font-medium px-3 py-2 rounded-xl transition hover:bg-opacity-60"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Bottom overlay content */}
        <div className="absolute bottom-0 left-0 right-0 px-5 md:px-8 pb-7">
          <div className="max-w-4xl mx-auto">

            {/* Badges row */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: statusM.bg, color: statusM.color }}
              >
                {statusM.label}
              </span>
              <span
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  backgroundColor: isFree ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.15)',
                  color: isFree ? '#4ade80' : T.gold,
                }}
              >
                {isFree ? 'Free Entry' : `₹${event.ticketPrice}`}
              </span>
              {venue?.name && (
                <span
                  className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', color: 'rgba(255,255,255,0.85)' }}
                >
                  {venue.name}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-display font-bold text-white leading-tight mb-2.5"
              style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)' }}>
              {event.title}
            </h1>

            {/* Date / time row */}
            <div className="flex items-center flex-wrap gap-x-5 gap-y-1">
              {event.date && (
                <div className="flex items-center gap-1.5 text-sm text-gray-300">
                  <CalendarDays className="w-3.5 h-3.5" style={{ color: T.gold }} />
                  <span>{fmtDate(event.date)}</span>
                </div>
              )}
              {event.time && (
                <div className="flex items-center gap-1.5 text-sm text-gray-300">
                  <Clock className="w-3.5 h-3.5" style={{ color: T.gold }} />
                  <span>{event.time}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          CONTENT
      ══════════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-8 order-2 lg:order-1">

            {/* About */}
            {event.description && (
              <section>
                <h2 className="text-lg font-display font-bold text-white mb-3">About This Event</h2>
                <p className="text-sm leading-relaxed" style={{ color: '#999' }}>
                  {event.description}
                </p>
              </section>
            )}

            {/* Event details grid */}
            <section>
              <h2 className="text-lg font-display font-bold text-white mb-4">Event Details</h2>
              <div
                className="rounded-2xl divide-y"
                style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, divideColor: T.border }}
              >
                {[
                  event.date && {
                    icon: CalendarDays,
                    label: 'Date',
                    value: fmtDate(event.date),
                  },
                  event.time && {
                    icon: Clock,
                    label: 'Time',
                    value: event.time,
                  },
                  venue?.name && {
                    icon: MapPin,
                    label: 'Venue',
                    value: venue.name + (venue.city ? `, ${venue.city}` : ''),
                    action: venue._id ? () => navigate(`/venues/${venue._id}`) : null,
                  },
                  event.capacity && {
                    icon: Users,
                    label: 'Capacity',
                    value: `${event.capacity} spots`,
                  },
                  {
                    icon: Ticket,
                    label: 'Ticket Price',
                    value: isFree ? 'Free Entry' : `₹${event.ticketPrice}`,
                  },
                ].filter(Boolean).map(({ icon: Icon, label, value, action }) => (
                  <div
                    key={label}
                    className="flex items-center gap-4 px-5 py-4"
                    style={{ borderColor: T.border }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: T.gold }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-[0.12em] mb-0.5" style={{ color: T.dim }}>{label}</p>
                      <p className="text-sm text-white font-medium">{value}</p>
                    </div>
                    {action && (
                      <button
                        onClick={action}
                        className="flex items-center gap-1 text-xs font-semibold transition hover:opacity-70"
                        style={{ color: T.gold }}
                      >
                        View <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Venue card */}
            {venue && (
              <section>
                <h2 className="text-lg font-display font-bold text-white mb-4">The Venue</h2>
                <div
                  className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer hover:opacity-80 transition"
                  style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
                  onClick={() => navigate(`/venues/${venue._id}`)}
                >
                  {/* Venue thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    {venue.images?.[0] ? (
                      <img src={venue.images[0]} alt={venue.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
                        <span className="text-2xl opacity-30 select-none">🏢</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{venue.name}</p>
                    {venue.city && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: T.dim }} />
                        <span className="text-xs" style={{ color: T.sub }}>{venue.city}</span>
                      </div>
                    )}
                    {venue.category && (
                      <span
                        className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 capitalize"
                        style={{ backgroundColor: T.cardLite, color: T.sub }}
                      >
                        {venue.category}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: T.dim }} />
                </div>
              </section>
            )}

            {/* More events at this venue */}
            {moreEvents.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-display font-bold text-white">More at {venue?.name || 'this venue'}</h2>
                  <button
                    onClick={() => navigate('/events')}
                    className="flex items-center gap-1 text-xs font-semibold transition hover:opacity-70"
                    style={{ color: T.gold }}
                  >
                    All events <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
                  {moreEvents.map((ev) => (
                    <MiniEventCard
                      key={ev._id}
                      event={ev}
                      onClick={() => {
                        navigate(`/events/${ev._id}`);
                        window.scrollTo(0, 0);
                      }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Right column — registration CTA ── */}
          {/* order-1 lg:order-2 so it appears first on mobile */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="lg:sticky lg:top-24">

              {/* Registration card */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
              >
                {/* Attendee count header */}
                <div
                  className="px-5 pt-5 pb-4"
                  style={{ borderBottom: `1px solid ${T.border}` }}
                >
                  <div className="flex items-end justify-between mb-1">
                    <div>
                      <p className="text-3xl font-bold text-white leading-none">{regCount}</p>
                      <p className="text-xs mt-1" style={{ color: T.sub }}>
                        {regCount === 1 ? 'person going' : 'people going'}
                      </p>
                    </div>
                    {event.capacity && (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{event.capacity - regCount}</p>
                        <p className="text-xs" style={{ color: T.sub }}>spots left</p>
                      </div>
                    )}
                  </div>

                  {/* Capacity bar */}
                  {event.capacity && (
                    <div
                      className="w-full rounded-full overflow-hidden mt-3"
                      style={{ height: '4px', backgroundColor: T.cardLite }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${capPct}%`,
                          backgroundColor: capPct >= 90 ? '#f87171' : T.gold,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* CTA section */}
                <div className="p-5">
                  {regError && (
                    <div
                      className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm"
                      style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {regError}
                    </div>
                  )}

                  {isPast ? (
                    <button
                      disabled
                      className="w-full py-4 rounded-xl font-bold text-sm"
                      style={{ backgroundColor: T.cardLite, color: T.dim, cursor: 'not-allowed' }}
                    >
                      Event Has Ended
                    </button>
                  ) : isFull && !isRegistered ? (
                    <button
                      disabled
                      className="w-full py-4 rounded-xl font-bold text-sm"
                      style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', cursor: 'not-allowed' }}
                    >
                      Fully Booked
                    </button>
                  ) : isRegistered ? (
                    <>
                      <button
                        className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                        style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}
                        onClick={() => setShowCancel((v) => !v)}
                      >
                        <CheckCircle className="w-5 h-5" />
                        You're Going!
                      </button>
                      {showCancel && (
                        <button
                          onClick={handleUnregister}
                          disabled={regLoading}
                          className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80 flex items-center justify-center gap-2"
                          style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)' }}
                        >
                          {regLoading ? <Spinner size="sm" /> : 'Cancel my registration'}
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={handleRegister}
                      disabled={regLoading}
                      className="w-full py-4 rounded-xl font-bold text-sm transition hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                      style={{ backgroundColor: T.gold, color: '#0d0d0d' }}
                    >
                      {regLoading ? (
                        <Spinner size="sm" />
                      ) : (
                        <>
                          Count Me In
                          <span className="text-base leading-none">🎉</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Ticket price note */}
                  {!isPast && (
                    <p className="text-xs text-center mt-3" style={{ color: T.dim }}>
                      {isFree
                        ? 'This event is free for Kulty members'
                        : `₹${event.ticketPrice} per person · Pay at venue`}
                    </p>
                  )}
                </div>
              </div>

              {/* Share hint */}
              {!isPast && isRegistered && (
                <div
                  className="mt-4 p-4 rounded-2xl text-center"
                  style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
                >
                  <p className="text-xs font-medium text-white mb-1">You're on the list 🎊</p>
                  <p className="text-xs" style={{ color: T.dim }}>
                    Show your Kulty card at the venue entrance
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <BottomNav />
    </div>
  );
};
