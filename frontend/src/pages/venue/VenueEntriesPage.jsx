import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText } from 'lucide-react';
import { getMyVenue, getVenueEntries } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { Pagination } from '../../components/common/Pagination';
import { format } from 'date-fns';

const T = {
  bg: '#0d0d0d', card: '#141414', border: 'rgba(255,255,255,0.07)',
  text: 'rgba(255,255,255,0.85)', muted: 'rgba(255,255,255,0.4)',
  gold: '#f59e0b',
};

const LIMIT = 20;

export const VenueEntriesPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [venueId, setVenueId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getMyVenue()
      .then((res) => {
        const venues = res.data?.venues || [];
        if (venues.length) setVenueId(venues[0]._id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!venueId) return;
    setLoading(true);
    getVenueEntries(venueId, { page, limit: LIMIT })
      .then((res) => {
        setEntries(Array.isArray(res.data) ? res.data : (res.data?.entries || []));
        setTotal(res.data?.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [venueId, page]);

  const billSummary = (bills = []) => ({
    pending:  bills.filter((b) => b.status === 'pending').length,
    approved: bills.filter((b) => b.status === 'approved').length,
    total:    bills.length,
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.bg }}>
      <div
        className="sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center gap-4"
        style={{ backgroundColor: T.bg, borderBottom: `1px solid ${T.border}` }}
      >
        <button onClick={() => navigate('/venue')} style={{ color: T.muted }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg leading-none" style={{ color: T.text }}>Entry Logs</h1>
        </div>
        {!loading && (
          <span className="text-sm" style={{ color: T.muted }}>{total} total</span>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : entries.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
          >
            <User className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: T.muted }} />
            <p style={{ color: T.muted }}>No entries yet. Start scanning member cards.</p>
          </div>
        ) : (
          <>
            <p className="text-sm mb-4" style={{ color: T.muted }}>
              Page {page} · {total} total check-ins
            </p>
            <div className="space-y-3">
              {entries.map((entry) => {
                const { pending, approved, total: billCount } = billSummary(entry.bills);
                return (
                  <div
                    key={entry._id}
                    className="rounded-2xl p-4 sm:p-5 flex items-start gap-4"
                    style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
                  >
                    {entry.userId?.profilePhoto ? (
                      <img src={entry.userId.profilePhoto} alt={entry.userId.name}
                        className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: T.gold }}
                      >
                        {entry.userId?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate" style={{ color: T.text }}>
                            {entry.userId?.name || 'Unknown'}
                          </p>
                          <p className="text-xs font-mono mt-0.5" style={{ color: T.muted }}>
                            {entry.userId?.membershipId}
                          </p>
                        </div>
                        <p className="text-xs flex-shrink-0" style={{ color: T.muted }}>
                          {format(new Date(entry.scannedAt), 'dd MMM, hh:mm a')}
                        </p>
                      </div>
                      {billCount > 0 && (
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1 text-xs" style={{ color: T.muted }}>
                            <FileText className="w-3 h-3" /> {billCount} bill{billCount > 1 ? 's' : ''}
                          </span>
                          {pending > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: T.gold }}>
                              {pending} pending
                            </span>
                          )}
                          {approved > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                              {approved} approved
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              page={page} total={total} limit={LIMIT} dark
              onChange={(p) => { setPage(p); window.scrollTo(0, 0); }}
            />
            <p className="text-center text-xs mt-3" style={{ color: T.muted }}>
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
