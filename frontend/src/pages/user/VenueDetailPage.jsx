import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, TrendingUp, ChevronRight } from 'lucide-react';
import { getVenue, getVenues } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { useAuth } from '../../hooks/useAuth';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:        '#0d0d0d',
  card:      '#141414',
  cardLite:  '#1c1c1c',
  border:    'rgba(255,255,255,0.07)',
  textSub:   '#888888',
  gold:      '#f59e0b',
};

// ─── Data helpers ─────────────────────────────────────────────────────────────
const stableRating = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return (4.1 + (Math.abs(h) % 9) / 10).toFixed(1);
};
const stableReviews = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 17 + s.charCodeAt(i)) & 0xffffffff;
  return 48 + (Math.abs(h) % 220);
};

// ─── Category metadata ────────────────────────────────────────────────────────
const META = {
  restaurant: {
    gradient: 'from-orange-500 via-amber-500 to-orange-600',
    tags:     ['Fine Dining', 'Gourmet', 'Global Cuisine'],
    atmo:     ['🍽️', '🥂', '🍷', '🥗', '🍰'],
  },
  club: {
    gradient: 'from-violet-600 via-purple-700 to-indigo-900',
    tags:     ['Nightlife', 'DJ Sets', 'Dance Floor'],
    atmo:     ['🎵', '💃', '🥂', '🎧', '🌃'],
  },
  spa: {
    gradient: 'from-emerald-500 via-teal-600 to-emerald-800',
    tags:     ['Wellness', 'Relaxation', 'Beauty'],
    atmo:     ['🌿', '💆', '🕯️', '🌸', '🛁'],
  },
  cafe: {
    gradient: 'from-amber-500 via-yellow-500 to-amber-700',
    tags:     ['Coffee', 'Brunch', 'Artisan Roasts'],
    atmo:     ['☕', '🧁', '📚', '🌿', '🍰'],
  },
  lounge: {
    gradient: 'from-indigo-500 via-blue-700 to-indigo-900',
    tags:     ['Cocktails', 'Live Music', 'Rooftop'],
    atmo:     ['🍸', '🌃', '🎶', '🛋️', '🥂'],
  },
  bar: {
    gradient: 'from-rose-600 via-red-700 to-rose-900',
    tags:     ['Craft Beer', 'Whiskey', 'Happy Hour'],
    atmo:     ['🍺', '🥃', '🎸', '🍻', '🌙'],
  },
  other: {
    gradient: 'from-gray-600 via-gray-700 to-gray-900',
    tags:     ['Premium', 'Exclusive', 'Members Only'],
    atmo:     ['✨', '🌟', '💎', '🎭', '🌆'],
  },
};

// ─── Atmosphere cell ──────────────────────────────────────────────────────────
const AtmoCell = ({ src, gradient, emoji, rounded = '' }) => (
  <div className={`w-full h-full overflow-hidden ${rounded}`}>
    {src ? (
      <img src={src} alt="" className="w-full h-full object-cover" />
    ) : (
      <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <span className="text-4xl select-none opacity-50">{emoji}</span>
      </div>
    )}
  </div>
);

// ─── Similar venue card ───────────────────────────────────────────────────────
const SimilarCard = ({ venue, onClick }) => {
  const cat  = venue.category?.toLowerCase() || 'other';
  const meta = META[cat] || META.other;
  const rating = stableRating(venue.name);
  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-44 rounded-2xl overflow-hidden cursor-pointer group"
      style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
    >
      <div className="relative h-32">
        {venue.images?.[0] ? (
          <img src={venue.images[0]} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
            <span className="text-3xl opacity-50 select-none">{meta.atmo[0]}</span>
          </div>
        )}
        {/* Rating */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        >
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          {rating}
        </div>
      </div>
      <div className="p-3">
        <p className="text-white text-sm font-semibold leading-snug mb-1 truncate">{venue.name}</p>
        <div className="flex items-center gap-1 mb-2">
          <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: T.textSub }} />
          <span className="text-xs truncate" style={{ color: T.textSub }}>{venue.city}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <span className="text-xs px-2 py-0.5 rounded-full capitalize font-medium"
            style={{ backgroundColor: T.cardLite, color: '#777' }}>
            {venue.category}
          </span>
          {(meta.tags[0]) && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: T.cardLite, color: '#777' }}>
              {meta.tags[0]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export const VenueDetailPage = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { profile } = useAuth();

  const [venue,   setVenue]   = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    const load = async () => {
      try {
        const res = await getVenue(id);
        const v   = res.data;
        setVenue(v);
        getVenues({ category: v.category, limit: 10 })
          .then((r) => {
            const list = (r.data?.venues || r.data || []).filter((x) => x._id !== id);
            setSimilar(list.slice(0, 8));
          })
          .catch(() => {});
      } catch {
        setError('Venue not found.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: T.bg }}>
        <Spinner />
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: T.bg }}>
        <p className="text-5xl mb-4">😕</p>
        <p className="text-white font-semibold mb-3">{error || 'Venue not found'}</p>
        <button onClick={() => navigate('/home')} className="text-sm text-accent-500 hover:underline">
          ← Back to home
        </button>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const cat      = venue.category?.toLowerCase() || 'other';
  const meta     = META[cat] || META.other;
  const rating   = stableRating(venue.name);
  const reviews  = stableReviews(venue.name);
  const isMember = profile?.subscription?.status === 'active';
  const atmo     = Array.from({ length: 5 }, (_, i) => venue.images?.[i] || null);

  const benefits = [
    { icon: '⚡', title: 'Priority Entry',
      desc: 'Skip the queue and walk in with your Kulty card' },
    { icon: '🥂', title: 'Welcome Drink',
      desc: 'Complimentary signature drink on every visit' },
    venue.cashbackPercentage > 0
      ? { icon: '💸', title: `${venue.cashbackPercentage}% Cashback`,
          desc: 'Earn cashback on your total spend at this venue' }
      : { icon: '🎁', title: 'Member Perks',
          desc: 'Exclusive discounts and special treatment for Kulty members' },
    { icon: '🎟️', title: 'Event Access',
      desc: 'First access to exclusive events hosted at this venue' },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ backgroundColor: T.bg }}>
      <Navbar />

      {/* ════════════════════════════════════════════════════
          HERO — full-width image / gradient, ~480 px tall
      ════════════════════════════════════════════════════ */}
      <div className="relative" style={{ height: 'clamp(360px, 50vw, 520px)' }}>

        {/* Background */}
        {venue.images?.[0] ? (
          <img src={venue.images[0]} alt={venue.name}
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`} />
        )}

        {/* Cinematic gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.55) 60%, rgba(13,13,13,1) 100%)' }} />

        {/* Back button */}
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
          <div className="max-w-5xl mx-auto">

            {/* Tag pills */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-xs font-bold px-3 py-1 rounded-full capitalize"
                style={{ backgroundColor: 'rgba(139,92,246,0.85)', backdropFilter: 'blur(4px)', color: '#fff' }}>
                {venue.category}
              </span>

              {venue.cashbackPercentage > 0 && (
                <span className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
                  style={{ border: `1px solid ${T.gold}`, color: T.gold, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                  <TrendingUp className="w-3 h-3" />
                  {venue.cashbackPercentage}% BACK (MEMBER BENEFIT)
                </span>
              )}

              {meta.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-xs font-medium px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)', color: 'rgba(255,255,255,0.85)' }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Venue name */}
            <h1 className="font-display font-bold text-white mb-2.5 leading-tight"
              style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
              {venue.name}
            </h1>

            {/* Location + rating row */}
            <div className="flex items-center flex-wrap gap-x-5 gap-y-1">
              {venue.city && (
                <div className="flex items-center gap-1.5 text-sm text-gray-300">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{[venue.address, venue.city].filter(Boolean).join(', ')}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-white font-semibold">{rating}</span>
                <span style={{ color: '#888' }}>({reviews} reviews)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          CONTENT SECTIONS
      ════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-12">

        {/* ── About ─────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-display font-bold text-white mb-3">About the Venue</h2>
          <p className="text-sm leading-relaxed" style={{ color: '#999' }}>
            {venue.description ||
              `${venue.name} is an exclusive ${venue.category} destination${venue.city ? ` in ${venue.city}` : ''}, offering an unparalleled experience for Kulty members. Discover curated moments and premium service with every visit.`}
          </p>
        </section>

        {/* ── Kulty Membership Benefits ─────────────────── */}
        <section>
          <div className="rounded-2xl p-5 md:p-6"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>

            {/* Header */}
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
                <span className="text-base">🏆</span>
              </div>
              <h2 className="text-base font-bold text-white">Kulty Membership Benefits</h2>
            </div>

            {/* 2-col grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefits.map(({ icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-4 rounded-xl"
                  style={{ backgroundColor: T.cardLite, border: `1px solid ${T.border}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
                    <span className="text-xl leading-none">{icon}</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold mb-0.5">{title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: '#777' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {!isMember && (
              <button
                onClick={() => navigate('/payment')}
                className="mt-5 w-full py-3.5 rounded-xl font-bold text-sm transition hover:opacity-90 active:scale-95"
                style={{ backgroundColor: T.gold, color: '#000' }}
              >
                Activate Membership — ₹999/yr
              </button>
            )}
          </div>
        </section>

        {/* ── Location ──────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-display font-bold text-white mb-4">Location</h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>

            {/* Stylised map placeholder */}
            <div className="relative flex items-center justify-center"
              style={{
                height: '220px',
                backgroundColor: '#11141e',
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
                backgroundSize: '44px 44px',
              }}>

              {/* Fake road lines */}
              <div className="absolute" style={{ width: '80%', height: '2px', backgroundColor: 'rgba(255,255,255,0.045)', top: '38%' }} />
              <div className="absolute" style={{ width: '2px',  height: '70%', backgroundColor: 'rgba(255,255,255,0.045)', left: '38%' }} />
              <div className="absolute" style={{ width: '50%', height: '2px', backgroundColor: 'rgba(255,255,255,0.03)', top: '60%', left: '25%' }} />
              <div className="absolute" style={{ width: '2px', height: '40%', backgroundColor: 'rgba(255,255,255,0.03)', left: '65%', top: '20%' }} />

              {/* Pin */}
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-xl"
                  style={{ backgroundColor: T.gold }}>
                  <MapPin className="w-5 h-5 text-gray-900" />
                </div>
                <div className="px-3 py-1.5 rounded-xl text-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
                  <p className="text-white text-xs font-semibold">{venue.name}</p>
                  {venue.city && <p className="text-xs mt-0.5" style={{ color: '#888' }}>{venue.city}</p>}
                </div>
              </div>
            </div>

            {/* Address bar */}
            <div className="flex items-center gap-3 px-5 py-3.5"
              style={{ backgroundColor: T.card }}>
              <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: T.gold }} />
              <p className="text-sm" style={{ color: '#999' }}>
                {[venue.address, venue.city].filter(Boolean).join(', ') || 'Address not available'}
              </p>
            </div>
          </div>
        </section>

        {/* ── Atmosphere gallery ─────────────────────────── */}
        <section>
          <h2 className="text-xl font-display font-bold text-white mb-4">Atmosphere</h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              display:             'grid',
              gridTemplateColumns: '60% 1fr 1fr',
              gridTemplateRows:    '178px 178px',
              gap:                 '3px',
            }}
          >
            {/* Large main image spans 2 rows */}
            <div style={{ gridRow: '1 / 3', overflow: 'hidden' }}>
              <AtmoCell src={atmo[0]} gradient={meta.gradient} emoji={meta.atmo[0]} />
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ overflow: 'hidden' }}>
                <AtmoCell src={atmo[i]} gradient={meta.gradient} emoji={meta.atmo[i % meta.atmo.length]} />
              </div>
            ))}
          </div>
        </section>

        {/* ── Explore similar venues ─────────────────────── */}
        {similar.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-display font-bold text-white">Explore Similar Venues</h2>
              <button
                onClick={() => navigate('/home')}
                className="flex items-center gap-1 text-xs font-semibold transition hover:opacity-80"
                style={{ color: T.gold }}
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
              {similar.map((v) => (
                <SimilarCard
                  key={v._id}
                  venue={v}
                  onClick={() => {
                    navigate(`/venues/${v._id}`);
                    window.scrollTo(0, 0);
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
