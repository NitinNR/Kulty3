import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText } from 'lucide-react';
import { getMyVenue, getVenueEntries } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { Pagination } from '../../components/common/Pagination';
import { format } from 'date-fns';

export const VenueEntriesPage = () => {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [limit,    setLimit]    = useState(20);
  const [venueId,  setVenueId]  = useState(null);
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
    getVenueEntries(venueId, { page, limit })
      .then((res) => {
        setEntries(Array.isArray(res.data) ? res.data : (res.data?.entries || []));
        setTotal(res.data?.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [venueId, page, limit]);

  const billSummary = (bills = []) => ({
    pending:  bills.filter((b) => b.status === 'pending').length,
    approved: bills.filter((b) => b.status === 'approved').length,
    total:    bills.length,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/venue')} className="hover:text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg flex-1">Entry Logs</h1>
        {!loading && (
          <span className="text-sm text-gray-400">{total} total</span>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <User className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400">No entries yet. Start scanning member cards.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {entries.map((entry) => {
                const { pending, approved, total: billCount } = billSummary(entry.bills);
                return (
                  <div
                    key={entry._id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-start gap-4"
                  >
                    {entry.userId?.profilePhoto ? (
                      <img
                        src={entry.userId.profilePhoto}
                        alt={entry.userId.name}
                        className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center text-sm font-bold text-amber-600 flex-shrink-0">
                        {entry.userId?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {entry.userId?.name || 'Unknown'}
                          </p>
                          <p className="text-xs font-mono text-gray-400 mt-0.5">
                            {entry.userId?.membershipId}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 flex-shrink-0">
                          {format(new Date(entry.scannedAt), 'dd MMM, hh:mm a')}
                        </p>
                      </div>
                      {billCount > 0 && (
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <FileText className="w-3 h-3" />
                            {billCount} bill{billCount > 1 ? 's' : ''}
                          </span>
                          {pending > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">
                              {pending} pending
                            </span>
                          )}
                          {approved > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">
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
              page={page}
              total={total}
              limit={limit}
              onChange={(p) => { setPage(p); window.scrollTo(0, 0); }}
              onLimitChange={(l) => { setLimit(l); setPage(1); }}
            />
          </>
        )}
      </div>
    </div>
  );
};
