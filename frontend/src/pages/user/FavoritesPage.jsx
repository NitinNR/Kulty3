import { useState, useEffect, useCallback } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFavorites, toggleFavorite } from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { VenueCard } from './HomePage';

const T = {
  bg:     '#0d0d0d',
  card:   '#141414',
  border: 'rgba(255,255,255,0.07)',
  gold:   '#f59e0b',
};

const LIMIT = 12;

const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-30"
        style={{ backgroundColor: T.card, color: '#fff', border: `1px solid ${T.border}` }}
      >
        ← Prev
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="w-9 h-9 rounded-xl text-sm font-medium transition"
          style={{
            backgroundColor: p === page ? T.gold : T.card,
            color:           p === page ? '#000'  : '#fff',
            border:          `1px solid ${p === page ? T.gold : T.border}`,
          }}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-30"
        style={{ backgroundColor: T.card, color: '#fff', border: `1px solid ${T.border}` }}
      >
        Next →
      </button>
    </div>
  );
};

export const FavoritesPage = () => {
  const navigate   = useNavigate();
  const [venues,     setVenues]     = useState([]);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [favoriteIds, setFavoriteIds] = useState(new Set());

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchPage = useCallback(async (pg) => {
    setLoading(true);
    try {
      const res = await getFavorites({ page: pg, limit: LIMIT });
      const data = res.data;
      setVenues(data.venues || []);
      setTotal(data.total || 0);
      setFavoriteIds(new Set((data.venues || []).map((v) => v._id)));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(page); }, [page, fetchPage]);

  const handlePageChange = (pg) => {
    setPage(pg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLikeToggle = (venueId, liked) => {
    if (!liked) {
      // removed from favorites — remove card and adjust total
      setVenues((prev) => prev.filter((v) => v._id !== venueId));
      setTotal((prev) => Math.max(0, prev - 1));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(venueId);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: T.bg, color: '#fff' }}>
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
            <Heart className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Saved Venues</h1>
            {!loading && (
              <p className="text-sm" style={{ color: '#888' }}>
                {total} {total === 1 ? 'venue' : 'venues'} saved
              </p>
            )}
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse"
                style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
                <div style={{ height: '200px', backgroundColor: '#1c1c1c' }} />
                <div className="p-4 space-y-2.5">
                  <div className="h-4 w-2/3 rounded-lg" style={{ backgroundColor: '#1c1c1c' }} />
                  <div className="h-3 w-1/2 rounded-lg" style={{ backgroundColor: '#1c1c1c' }} />
                  <div className="h-3 w-3/5 rounded-lg" style={{ backgroundColor: '#1c1c1c' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && venues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}>
              <Heart className="w-9 h-9 text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold mb-1">No saved venues yet</p>
              <p className="text-sm" style={{ color: '#888' }}>
                Tap the heart on any venue to save it here
              </p>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: T.gold, color: '#000' }}
            >
              Discover Venues
            </button>
          </div>
        )}

        {/* Venue grid */}
        {!loading && venues.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {venues.map((venue) => (
                <VenueCard
                  key={venue._id}
                  venue={venue}
                  onClick={() => navigate(`/venues/${venue._id}`)}
                  initialLiked={favoriteIds.has(venue._id)}
                  onLikeToggle={handleLikeToggle}
                />
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
