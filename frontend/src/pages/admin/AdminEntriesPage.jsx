import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode } from 'lucide-react';
import { getAllEntries } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { Pagination } from '../../components/common/Pagination';
import { format } from 'date-fns';

const LIMIT = 20;

export const AdminEntriesPage = () => {
  const [entries, setEntries] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const navigate = useNavigate();

  const fetch = async (pg = 1) => {
    setLoading(true);
    try {
      const res = await getAllEntries({ page: pg, limit: LIMIT });
      setEntries(res.data?.entries || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(page); }, [page]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-4 sm:px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/admin')} className="hover:text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold">Entry Logs</h1>
        <span className="text-gray-400 text-sm ml-auto">{total} total</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No entries yet.</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Member</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Venue</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Scanned At</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Bills</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {entries.map((entry) => {
                      const pendingBills  = (entry.bills || []).filter((b) => b.status === 'pending').length;
                      const approvedBills = (entry.bills || []).filter((b) => b.status === 'approved').length;
                      return (
                        <tr key={entry._id} className="hover:bg-gray-50">
                          <td className="px-4 sm:px-6 py-4">
                            <p className="font-medium text-gray-900">{entry.userId?.name || '—'}</p>
                            <p className="text-xs text-gray-400 font-mono">{entry.userId?.membershipId}</p>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-gray-700">{entry.venueId?.name || '—'}</td>
                          <td className="px-4 sm:px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                            {entry.scannedAt ? format(new Date(entry.scannedAt), 'dd MMM yyyy, hh:mm a') : '—'}
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="flex gap-2 flex-wrap">
                              {pendingBills > 0 && (
                                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                                  {pendingBills} pending
                                </span>
                              )}
                              {approvedBills > 0 && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                                  {approvedBills} approved
                                </span>
                              )}
                              {!entry.bills?.length && <span className="text-gray-300 text-xs">none</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination page={page} total={total} limit={LIMIT} onChange={(p) => { setPage(p); window.scrollTo(0, 0); }} />
            <p className="text-center text-xs text-gray-400 mt-3">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
