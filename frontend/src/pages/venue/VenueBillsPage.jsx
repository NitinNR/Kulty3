import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Clock, ImageIcon, X } from 'lucide-react';
import { getMyVenue, getVenueEntries, approveBill } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { Pagination } from '../../components/common/Pagination';
import { format } from 'date-fns';

const statusBadge = {
  pending:  { bg: 'bg-amber-50',   text: 'text-amber-600',  label: 'Pending'  },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Approved' },
  rejected: { bg: 'bg-red-50',     text: 'text-red-500',    label: 'Rejected' },
};

const StatusBadge = ({ status }) => {
  const s = statusBadge[status] || statusBadge.pending;
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
};

const FILTERS = ['pending', 'approved', 'rejected', 'all'];

export const VenueBillsPage = () => {
  const [bills,        setBills]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('pending');
  const [billPage,     setBillPage]     = useState(1);
  const [billsPerPage, setBillsPerPage] = useState(15);
  const [updating,     setUpdating]     = useState(null);
  const [previewImg,   setPreviewImg]   = useState(null);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [rejectNote,   setRejectNote]   = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const venueRes = await getMyVenue();
        const venues   = venueRes.data?.venues || [];
        if (!venues.length) { setLoading(false); return; }
        const res     = await getVenueEntries(venues[0]._id, { limit: 500 });
        const entries = res.data?.entries || [];
        const flat    = [];
        entries.forEach((entry) => {
          (entry.bills || []).forEach((bill) => {
            flat.push({ bill, entryId: entry._id, member: entry.userId });
          });
        });
        setBills(flat);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const doVerdict = async (entryId, billId, status, note = '') => {
    const key = `${entryId}-${billId}`;
    setUpdating(key);
    try {
      await approveBill(entryId, billId, { status, note });
      setBills((prev) =>
        prev.map((item) =>
          item.entryId === entryId && item.bill._id === billId
            ? { ...item, bill: { ...item.bill, status, note } }
            : item
        )
      );
      setRejectModal(null);
      setRejectNote('');
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUpdating(null);
    }
  };

  const filtered       = filter === 'all' ? bills : bills.filter((b) => b.bill.status === filter);
  const paginatedBills = filtered.slice((billPage - 1) * billsPerPage, billPage * billsPerPage);

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? bills.length : bills.filter((b) => b.bill.status === f).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gray-900 text-white sticky top-0 z-30 px-4 sm:px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/venue')} className="hover:text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg leading-none">Bill Approvals</h1>
          {!loading && (
            <p className="text-xs text-gray-400 mt-0.5">{counts.pending} pending review</p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Filter pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => { setFilter(f); setBillPage(1); }}
                className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-full transition ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span className="ml-1.5 opacity-60 font-normal">({counts[f]})</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 font-medium">
              No {filter === 'all' ? '' : filter} bills
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedBills.map(({ bill, entryId, member }) => {
                const key        = `${entryId}-${bill._id}`;
                const isUpdating = updating === key;

                return (
                  <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    {/* Member row */}
                    <div className="flex items-center gap-3 mb-4">
                      {member?.profilePhoto ? (
                        <img
                          src={member.profilePhoto}
                          alt={member.name}
                          className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-100"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-sm font-bold text-amber-600 flex-shrink-0">
                          {member?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {member?.name || 'Unknown Member'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {bill.uploadedAt ? format(new Date(bill.uploadedAt), 'dd MMM yyyy, hh:mm a') : ''}
                        </p>
                      </div>
                      <StatusBadge status={bill.status} />
                    </div>

                    {/* Bill details */}
                    <div className="flex items-center gap-4 mb-3">
                      {bill.imageUrl ? (
                        <button
                          onClick={() => setPreviewImg(bill.imageUrl)}
                          className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 hover:opacity-80 transition"
                        >
                          <img src={bill.imageUrl} alt="bill" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Amount</p>
                        <p className="text-2xl font-bold text-gray-900">₹{bill.amount}</p>
                      </div>
                    </div>

                    {/* Actions for pending */}
                    {bill.status === 'pending' && (
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => doVerdict(entryId, bill._id, 'approved')}
                          disabled={isUpdating}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => { setRejectModal({ entryId, billId: bill._id }); setRejectNote(''); }}
                          disabled={isUpdating}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}

                    {bill.note && (
                      <p className="mt-3 text-xs italic text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
                        "{bill.note}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <Pagination
              page={billPage}
              total={filtered.length}
              limit={billsPerPage}
              onChange={(p) => { setBillPage(p); window.scrollTo(0, 0); }}
              onLimitChange={(l) => { setBillsPerPage(l); setBillPage(1); }}
            />
          </>
        )}
      </div>

      {/* Image preview overlay */}
      {previewImg && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImg(null)}
        >
          <img
            src={previewImg}
            alt="Bill"
            className="max-w-full max-h-full rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            onClick={() => setPreviewImg(null)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Reject note modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setRejectModal(null); }}
        >
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="font-bold text-gray-900">Reject Bill</p>
              <button
                onClick={() => setRejectModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
              Reason (optional)
            </label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Receipt not clear, amount mismatch…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none mb-5"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => doVerdict(rejectModal.entryId, rejectModal.billId, 'rejected', rejectNote)}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
