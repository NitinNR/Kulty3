import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, TrendingUp, Star, Clock, ChevronRight, CreditCard, Tag } from 'lucide-react';
import { getVenue, getEvents } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';

const GRADIENTS = {
  restaurant: 'from-orange-400 via-amber-500 to-orange-600',
  club:       'from-violet-500 via-purple-600 to-purple-800',
  spa:        'from-emerald-400 via-teal-500 to-emerald-700',
  cafe:       'from-amber-400 via-yellow-500 to-amber-600',
  lounge:     'from-indigo-500 via-blue-600 to-indigo-800',
  bar:        'from-rose-500 via-red-600 to-rose-800',
  other:      'from-gray-600 via-gray-700 to-gray-800',
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

const CATEGORY_DESC = {
  restaurant: 'Fine dining & culinary experiences',
  club:       'Nightlife & entertainment',
  spa:        'Wellness & relaxation',
  cafe:       'Coffee & casual vibes',
  lounge:     'Upscale social spaces',
  bar:        'Drinks & good company',
  other:      'Unique experiences',
};

export const VenueDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [venue, setVenue]   = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const venueRes = await getVenue(id);
        setVenue(venueRes.data);

        // Fetch events for this venue (silently ignore if unsupported)
        try {
          const eventsRes = await getEvents({ venueId: id, limit: 5 });
          setEvents(eventsRes.data?.events || eventsRes.data || []);
        } catch {
          // events filter by venue may not be supported — that's fine
        }
      } catch (err) {
        setError('Venue not found or unavailable.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">😕</p>
          <p className="text-gray-700 font-semibold mb-2">{error || 'Venue not found'}</p>
          <button onClick={() => navigate('/home')} className="text-sm text-amber-600 hover:underline">
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  const cat      = venue.category?.toLowerCase() || 'other';
  const gradient = GRADIENTS[cat] || GRADIENTS.other;
  const emoji    = CATEGORY_EMOJI[cat] || '🏢';
  const catDesc  = CATEGORY_DESC[cat] || '';
  const isMember = profile?.subscription?.status === 'active';

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className={`relative bg-gradient-to-br ${gradient} overflow-hidden`}>
        {/* Back button */}
        <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-safe pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-black bg-opacity-30 hover:bg-opacity-40 text-white px-3 py-2 rounded-xl transition backdrop-blur-sm text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        {/* Background image */}
        {venue.images?.[0] ? (
          <div className="absolute inset-0">
            <img src={venue.images[0]} alt={venue.name} className="w-full h-full object-cover opacity-30" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <span className="text-[160px]">{emoji}</span>
          </div>
        )}

        {/* Hero content */}
        <div className="relative px-4 pt-20 pb-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-white bg-opacity-20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full capitalize">
              {venue.category || 'venue'}
            </span>
            {venue.city && (
              <span className="bg-white bg-opacity-20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {venue.city}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 leading-tight">
            {venue.name}
          </h1>
          <p className="text-white text-opacity-80 text-sm">{catDesc}</p>

          {/* Cashback highlight */}
          {venue.cashbackPercentage > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 bg-white bg-opacity-95 text-gray-900 px-4 py-2.5 rounded-2xl shadow-lg">
              <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 leading-none">Member cashback</p>
                <p className="text-base font-bold text-emerald-600 leading-none mt-0.5">
                  {venue.cashbackPercentage}% on every visit
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* About */}
        {venue.description && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">About this Venue</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{venue.description}</p>
          </div>
        )}

        {/* Details card */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">Details</h2>
          <div className="space-y-3">
            {venue.address && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Address</p>
                  <p className="text-sm text-gray-700 font-medium">{venue.address}{venue.city ? `, ${venue.city}` : ''}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Tag className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Category</p>
                <p className="text-sm text-gray-700 font-medium capitalize">{venue.category}</p>
              </div>
            </div>

            {venue.cashbackPercentage > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Cashback for members</p>
                  <p className="text-sm font-bold text-emerald-600">{venue.cashbackPercentage}% on bills</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Amenities */}
        {venue.amenities?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-900 mb-3">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {venue.amenities.map((a) => (
                <span key={a} className="bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full capitalize">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Member benefits */}
        <div className={`rounded-2xl p-5 ${isMember ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200' : 'bg-gray-100'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMember ? 'bg-amber-400' : 'bg-gray-300'}`}>
              <CreditCard className={`w-5 h-5 ${isMember ? 'text-gray-900' : 'text-gray-500'}`} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Member Benefits</h2>
              <p className="text-xs text-gray-500">Exclusive perks at this venue</p>
            </div>
          </div>

          <ul className="space-y-2 mb-4">
            {venue.cashbackPercentage > 0 && (
              <li className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-emerald-500 text-base">✓</span>
                <span>{venue.cashbackPercentage}% cashback on every bill</span>
              </li>
            )}
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-emerald-500 text-base">✓</span>
              <span>Priority entry with Kulty QR scan</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-emerald-500 text-base">✓</span>
              <span>Track all visits in your history</span>
            </li>
          </ul>

          {isMember ? (
            <button
              onClick={() => navigate('/card')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition text-sm"
            >
              <CreditCard className="w-4 h-4" />
              Show my membership card
            </button>
          ) : (
            <button
              onClick={() => navigate('/payment')}
              className="w-full py-3 bg-amber-400 text-gray-900 rounded-xl font-bold hover:bg-amber-500 transition text-sm"
            >
              Activate Membership — ₹999/yr
            </button>
          )}
        </div>

        {/* How to use */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">How to use your membership</h2>
          <ol className="space-y-4">
            {[
              { step: '1', icon: '📱', title: 'Open your card', desc: 'Tap "My Membership Card" to view your QR code' },
              { step: '2', icon: '🔍', title: 'Get scanned at entry', desc: 'Ask the venue staff to scan your Kulty QR code' },
              { step: '3', icon: '🧾', title: 'Upload your bill', desc: 'After dining, upload your bill in History to claim cashback' },
            ].map(({ step, icon, title, desc }) => (
              <li key={step} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{icon} {title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Upcoming events at this venue */}
        {events.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-bold text-gray-900 mb-4">Events here</h2>
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🎉</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                    {event.date && (
                      <p className="text-xs text-gray-400">
                        {new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  {event.ticketPrice > 0 && (
                    <span className="text-sm font-bold text-gray-900 flex-shrink-0">₹{event.ticketPrice}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom padding */}
      <div className="h-8" />
    </div>
  );
};
