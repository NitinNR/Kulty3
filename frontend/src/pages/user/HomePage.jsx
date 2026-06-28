import { useState, useEffect } from 'react';
import { Search, MapPin, Percent, CreditCard, ChevronRight } from 'lucide-react';
import { getVenues, getEvents } from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { Badge } from '../../components/common/Badge';
import { Spinner } from '../../components/common/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const categories = ['All', 'Restaurant', 'Club', 'Spa', 'Café', 'Lounge', 'Bar'];

export const HomePage = () => {
  const [venues, setVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const venuesRes = await getVenues({
          search,
          category: category === 'All' ? '' : category,
        });
        const eventsRes = await getEvents({ limit: 5 });

        setVenues(venuesRes.data?.venues || venuesRes.data || []);
        setEvents(eventsRes.data?.events || eventsRes.data || []);
      } catch (err) {
        console.error('Failed to fetch venues/events:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(timer);
  }, [search, category]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0">
      <Navbar />

      <div className="flex-1">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-display font-bold mb-8">Discover Venues</h1>

            <div className="max-w-2xl">
              <div className="relative mb-6">
                <Search className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search venues..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 rounded-full font-medium transition whitespace-nowrap ${
                      category === cat
                        ? 'bg-accent-500 text-white'
                        : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Membership card quick access */}
        {profile?.subscription?.status === 'active' && (
          <div className="max-w-7xl mx-auto px-4 pt-8 pb-0">
            <button
              onClick={() => navigate('/card')}
              className="w-full flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl px-6 py-4 shadow-lg hover:from-gray-800 hover:to-gray-700 transition group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white bg-opacity-10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">My Membership Card</p>
                  <p className="text-xs text-gray-400">
                    {profile?.membershipId || 'View your QR code'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition" />
            </button>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-12">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
                Featured Venues
              </h2>

              {venues.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No venues found. Try adjusting your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  {venues.map((venue) => (
                    <div
                      key={venue._id}
                      onClick={() => navigate(`/venues/${venue._id}`)}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
                    >
                      {venue.images?.[0] && (
                        <div className="h-48 bg-gray-200 overflow-hidden">
                          <img
                            src={venue.images[0]}
                            alt={venue.name}
                            className="w-full h-full object-cover hover:scale-105 transition"
                          />
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{venue.name}</h3>
                          <Badge variant="primary" className="flex-shrink-0">
                            {venue.category}
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {venue.description}
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span>{venue.city}</span>
                          </div>

                          {venue.cashbackPercentage > 0 && (
                            <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                              <Percent className="w-4 h-4" />
                              <span>{venue.cashbackPercentage}% Cashback</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {events.length > 0 && (
                <>
                  <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
                    Upcoming Events
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {events.map((event) => (
                      <div
                        key={event._id}
                        onClick={() => navigate(`/events/${event._id}`)}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer"
                      >
                        {event.bannerImage && (
                          <div className="h-40 bg-gray-200 overflow-hidden">
                            <img
                              src={event.bannerImage}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className="p-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {event.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-4">{event.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-accent-600">
                              ₹{event.ticketPrice}
                            </span>
                            <Badge>{event.status}</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};
