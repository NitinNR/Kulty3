import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock,
  ImageIcon, ChevronDown, X,
} from 'lucide-react';
import { getMyVenue, getVenueEntries, approveBill } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { Pagination } from '../../components/common/Pagination';
import { format } from 'date-fns';

const T = {
  bg:     '#0d0d0d',
  card:   '#141414',
  lite:   '#1c1c1c',
  border: 'rgba(255,255,255,0.07)',
  gold:   '#f59e0b',
  text:   'rgba(255,255,255,0.85)',
  muted:  'rgba(255,255,255,0.4)',
  dim:    'rgba(255,255,255,0.22)',
};

const StatusBadge = ({ status }) => {
  const map = {
    pending:  { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b',  label: 'Pending'  },
    approved: { bg: 'rgba(16,185,129,0.12)', color: '#10b981',  label: 'Approved' },
    rejected: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444',  label: 'Rejected' },
  };
  const s = map[status] || map.pending;
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
};

const FILTERS = ['pending', 'approved', 'rejected', 'all'];
const BILLS_PER_PAGE = 15;

export const VenueBillsPage = () => {
  const [bills, setBills]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('pending');
  const [billPage, setBillPage]   = useState(1);
  const [updating, setUpdating]   = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // { entryId, billId }
  const [rejectNote, setRejectNote]   = useState('');
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

  const openReject = (entryId, billId) => {
    setRejectModal({ entryId, billId });
    setRejectNote('');
  };

  const filtered = filter === 'all' ? bills : bills.filter((b) => b.bill.status === filter);
  const paginatedBills = filtered.slice((billPage - 1) * BILLS_PER_PAGE, billPage * BILLS_PER_PAGE);

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? bills.length : bills.filter((b) => b.bill.status === f).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: T.bg }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-4 flex items-center gap-4"
        style={{ backgroundColor: T.bg, borderBottom: `1px solid ${T.border}` }}
      >
        <button onClick={() => navigate('/venue')} style={{ color: T.muted }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-lg leading-none" style={{ color: T.text }}>Bill Approvals</h1>
          {!loading && (
            <p className="text-xs mt-0.5" style={{ color: T.muted }}>
              {counts.pending} pending review
            </p>
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
                className="flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-full transition"
                style={active
                  ? { backgroundColor: T.gold, color: '#0d0d0d' }
                  : { backgroundColor: T.card, color: T.muted, border: `1px solid ${T.border}` }
                }
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
          <div
            className="rounded-2xl p-12 text-center"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
          >
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: T.gold }} />
            <p className="font-medium" style={{ color: T.muted }}>
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
                <div
                  key={key}
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
                >
                  {/* Member row */}
                  <div className="flex items-center gap-3 mb-4">
                    {member?.profilePhoto ? (
                      <img
                        src={member.profilePhoto}
                        alt={member.name}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        style={{ border: `1px solid ${T.border}` }}
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: T.gold }}
                      >
                        {member?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: T.text }}>
                        {member?.name || 'Unknown Member'}
                      </p>
                      <p className="text-xs" style={{ color: T.muted }}>
                        {bill.uploadedAt ? format(new Date(bill.uploadedAt), 'dd MMM yyyy, hh:mm a') : ''}
                      </p>
                    </div>
                    <StatusBadge status={bill.status} />
                  </div>

                  {/* Bill details — thumbnail + amount */}
                  <div className="flex items-center gap-4 mb-3">
                    {bill.imageUrl ? (
                      <button
                        onClick={() => setPreviewImg(bill.imageUrl)}
                        className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 transition hover:opacity-80"
                        style={{ border: `1px solid ${T.border}` }}
                      >
                        <img src={bill.imageUrl} alt="bill" className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div
                        className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ border: `1px dashed ${T.border}` }}
                      >
                        <ImageIcon className="w-5 h-5" style={{ color: T.dim }} />
                      </div>
                    )}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: T.muted }}>Amount</p>
                      <p className="text-2xl font-bold" style={{ color: T.text }}>₹{bill.amount}</p>
                    </div>
                  </div>

                  {/* Actions for pending — full width on mobile */}
                  {bill.status === 'pending' && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => doVerdict(entryId, bill._id, 'approved')}
                        disabled={isUpdating}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition"
                        style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => openReject(entryId, bill._id)}
                        disabled={isUpdating}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition"
                        style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}

                  {bill.note && (
                    <p
                      className="mt-3 text-xs italic rounded-xl px-3 py-2"
                      style={{ backgroundColor: T.lite, color: T.muted }}
                    >
                      "{bill.note}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {filtered.length > BILLS_PER_PAGE && (
            <Pagination
              page={billPage}
              total={filtered.length}
              limit={BILLS_PER_PAGE}
              dark
              onChange={(p) => { setBillPage(p); window.scrollTo(0, 0); }}
            />
          )}
          </>
        )}
      </div>

      {/* Image preview */}
      {previewImg && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImg(null)}
        >
          <img src={previewImg} alt="Bill" className="max-w-full max-h-full rounded-2xl" />
          <button
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
            onClick={() => setPreviewImg(null)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Reject note modal */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setRejectModal(null); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: '#1a1a1a', border: `1px solid ${T.border}` }}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="font-bold" style={{ color: T.text }}>Reject Bill</p>
              <button
                onClick={() => setRejectModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: T.muted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: T.muted }}>
              Reason (optional)
            </label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Receipt not clear, amount mismatch…"
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none mb-5"
              style={{ backgroundColor: T.lite, border: `1px solid ${T.border}`, color: T.text }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: T.lite, color: T.muted }}
              >
                Cancel
              </button>
              <button
                onClick={() => doVerdict(rejectModal.entryId, rejectModal.billId, 'rejected', rejectNote)}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition"
                style={{ backgroundColor: 'rgba(239,68,68,0.9)', color: '#fff' }}
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
