import { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  Upload, Camera, CheckCircle2, XCircle, Clock,
  Receipt, Banknote, ChevronDown, ChevronUp, MapPin, X,
} from 'lucide-react';
import { getMyEntries, uploadBill } from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { ToastContext } from '../../contexts/ToastContext';
import { format } from 'date-fns';

const T = {
  bg:       '#0d0d0d',
  card:     '#141414',
  lite:     '#1c1c1c',
  border:   'rgba(255,255,255,0.07)',
  gold:     '#f59e0b',
  text:     'rgba(255,255,255,0.85)',
  muted:    'rgba(255,255,255,0.4)',
  dim:      'rgba(255,255,255,0.22)',
};

const compressToBase64 = (file) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1400;
      let { naturalWidth: w, naturalHeight: h } = img;
      const r = Math.min(MAX / w, MAX / h, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * r);
      canvas.height = Math.round(h * r);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = URL.createObjectURL(file);
  });

const StatusBadge = ({ status }) => {
  const map = {
    pending:  { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b',  icon: Clock,         label: 'Pending'  },
    approved: { bg: 'rgba(16,185,129,0.12)', color: '#10b981',  icon: CheckCircle2,  label: 'Approved' },
    rejected: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444',  icon: XCircle,       label: 'Rejected' },
  };
  const s = map[status] || map.pending;
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
};

const ENTRY_LIMIT = 15;

export const EntryHistoryPage = () => {
  const [entries,     setEntries]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(false);
  const [entryPage,   setEntryPage]   = useState(1);
  const [expanded,    setExpanded]    = useState({});
  const [modal,       setModal]       = useState(null);
  const [billFile,    setBillFile]    = useState(null);
  const [billPreview, setBillPreview] = useState(null);
  const [billAmount,  setBillAmount]  = useState('');
  const [uploading,   setUploading]   = useState(false);
  const fileRef     = useRef(null);
  const cameraRef   = useRef(null);
  const sentinelRef = useRef(null);
  const toast       = useContext(ToastContext);

  const fetchEntries = useCallback(async (pg, append = false) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const r = await getMyEntries({ page: pg, limit: ENTRY_LIMIT });
      const fetched = r.data?.entries || [];
      const total   = r.data?.total   || 0;
      setEntries((prev) => append ? [...prev, ...fetched] : fetched);
      setHasMore(pg * ENTRY_LIMIT < total);
      setEntryPage(pg);
    } catch {
      toast?.showError?.('Failed to load visit history');
    } finally {
      if (pg === 1) setLoading(false); else setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchEntries(1, false); }, []);

  useEffect(() => {
    if (!hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchEntries(entryPage + 1, true); },
      { rootMargin: '200px' }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, entryPage, fetchEntries]);

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const openModal = (entry) => {
    setModal(entry);
    setBillFile(null);
    setBillPreview(null);
    setBillAmount('');
  };

  const closeModal = () => {
    setModal(null);
    setBillPreview(null);
  };

  const pickFile = (file) => {
    if (!file) return;
    setBillFile(file);
    setBillPreview(URL.createObjectURL(file));
  };

  const submitBill = async () => {
    if (!billFile || !billAmount) {
      toast?.showError?.('Please add a photo and enter the amount');
      return;
    }
    try {
      setUploading(true);
      const imageUrl = await compressToBase64(billFile);
      const res = await uploadBill(modal._id, { imageUrl, amount: Number(billAmount) });
      // Preserve populated venueId — only update bills array from response
      setEntries((prev) =>
        prev.map((e) => e._id === modal._id ? { ...e, bills: res.data.bills } : e)
      );
      toast?.showSuccess?.('Bill submitted! Awaiting venue approval.');
      closeModal();
    } catch (err) {
      toast?.showError?.(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const totalCashback = entries.reduce(
    (sum, e) => sum + (e.cashback?.amount || 0),
    0
  );

  return (
    <div className="min-h-screen pb-24 md:pb-10" style={{ backgroundColor: T.bg }}>
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: T.text }}>Visit History</h1>
          <p className="text-sm mt-1" style={{ color: T.muted }}>
            Upload bills from your venue visits to earn cashback
          </p>
        </div>

        {/* Cashback earned banner */}
        {totalCashback > 0 && (
          <div
            className="rounded-2xl p-5 mb-6 flex items-center gap-4"
            style={{ backgroundColor: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}
            >
              <Banknote className="w-5 h-5" style={{ color: T.gold }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(245,158,11,0.55)' }}>
                Cashback Earned
              </p>
              <p className="text-2xl font-bold" style={{ color: T.gold }}>₹{totalCashback}</p>
            </div>
          </div>
        )}

        {/* Entry list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl h-20 animate-pulse" style={{ backgroundColor: T.card }} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
          >
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: T.gold }} />
            <p className="font-semibold mb-1" style={{ color: T.text }}>No visits yet</p>
            <p className="text-sm" style={{ color: T.muted }}>
              Visit a venue and let staff scan your Kulty card to check in
            </p>
          </div>
        ) : (
          <>
          <div className="space-y-3">
            {entries.map((entry) => {
              const bills     = entry.bills || [];
              const pending   = bills.filter((b) => b.status === 'pending').length;
              const cashback  = entry.cashback?.amount || 0;
              const isOpen    = expanded[entry._id];
              const venue     = entry.venueId;

              return (
                <div
                  key={entry._id}
                  className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
                >
                  {/* Header row */}
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {/* Venue avatar */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
                        style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: T.gold }}
                      >
                        {venue?.name?.[0]?.toUpperCase() || 'V'}
                      </div>

                      {/* Venue info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate text-sm" style={{ color: T.text }}>
                          {venue?.name || 'Unknown Venue'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {venue?.city && (
                            <span className="text-xs flex items-center gap-0.5" style={{ color: T.muted }}>
                              <MapPin className="w-3 h-3" />{venue.city}
                            </span>
                          )}
                          <span className="text-xs" style={{ color: T.dim }}>
                            {format(new Date(entry.scannedAt), 'dd MMM yyyy, hh:mm a')}
                          </span>
                        </div>
                      </div>

                      {/* Right side */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {cashback > 0 ? (
                          <span className="text-sm font-bold" style={{ color: '#10b981' }}>
                            +₹{cashback}
                          </span>
                        ) : pending > 0 ? (
                          <span
                            className="text-xs px-2 py-1 rounded-full font-medium"
                            style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: T.gold }}
                          >
                            {pending} pending
                          </span>
                        ) : bills.length === 0 ? (
                          <button
                            onClick={() => openModal(entry)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg"
                            style={{ backgroundColor: T.gold, color: '#0d0d0d' }}
                          >
                            Upload Bill
                          </button>
                        ) : null}

                        {bills.length > 0 && (
                          <button
                            onClick={() => toggle(entry._id)}
                            className="flex items-center gap-0.5 text-xs"
                            style={{ color: T.dim }}
                          >
                            {bills.length} bill{bills.length !== 1 ? 's' : ''}
                            {isOpen
                              ? <ChevronUp className="w-3.5 h-3.5" />
                              : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded bills */}
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${T.border}`, padding: '12px 16px 16px' }}>
                      <div className="space-y-2">
                        {bills.map((bill, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 rounded-xl p-3"
                            style={{ backgroundColor: T.lite }}
                          >
                            {bill.imageUrl ? (
                              <img
                                src={bill.imageUrl}
                                alt="bill"
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                style={{ border: `1px solid ${T.border}` }}
                              />
                            ) : (
                              <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px dashed ${T.border}` }}
                              >
                                <Receipt className="w-4 h-4" style={{ color: T.dim }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm" style={{ color: T.text }}>₹{bill.amount}</p>
                              {bill.uploadedAt && (
                                <p className="text-xs mt-0.5" style={{ color: T.dim }}>
                                  {format(new Date(bill.uploadedAt), 'dd MMM, hh:mm a')}
                                </p>
                              )}
                              {bill.note && (
                                <p className="text-xs mt-1 italic" style={{ color: T.muted }}>"{bill.note}"</p>
                              )}
                            </div>
                            <StatusBadge status={bill.status} />
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => openModal(entry)}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
                        style={{
                          backgroundColor: 'rgba(245,158,11,0.05)',
                          border: '1px dashed rgba(245,158,11,0.22)',
                          color: T.gold,
                        }}
                      >
                        <Upload className="w-4 h-4" />
                        Add another bill
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div ref={sentinelRef} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: `${T.gold} transparent transparent transparent` }} />
            </div>
          )}
          {!hasMore && entries.length > 0 && (
            <p className="text-center text-xs pt-2 pb-4" style={{ color: T.dim }}>
              All {entries.length} visits loaded
            </p>
          )}
          </>
        )}
      </div>

      {/* ── Upload modal ── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: '#1a1a1a', border: `1px solid ${T.border}` }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-white">Upload Bill</p>
                <p className="text-xs mt-0.5" style={{ color: T.muted }}>
                  {modal.venueId?.name || 'Venue'} •{' '}
                  {format(new Date(modal.scannedAt), 'dd MMM yyyy')}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: T.muted }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image picker */}
            {billPreview ? (
              <div className="relative rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
                <img src={billPreview} alt="Bill preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setBillFile(null); setBillPreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl transition"
                  style={{ backgroundColor: T.lite, border: `1px dashed ${T.border}`, color: T.muted }}
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-medium">Take Photo</span>
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-6 rounded-xl transition"
                  style={{ backgroundColor: T.lite, border: `1px dashed ${T.border}`, color: T.muted }}
                >
                  <Upload className="w-6 h-6" />
                  <span className="text-xs font-medium">Choose File</span>
                </button>
              </div>
            )}

            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => pickFile(e.target.files[0])} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => pickFile(e.target.files[0])} />

            {/* Amount */}
            <div className="mb-5">
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: T.muted }}>
                Total Bill Amount
              </label>
              <div className="relative">
                <span
                  className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-sm"
                  style={{ color: T.muted }}
                >₹</span>
                <input
                  type="number"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  placeholder="0"
                  min="1"
                  className="w-full pl-8 pr-4 py-3.5 rounded-xl text-sm outline-none font-semibold"
                  style={{ backgroundColor: T.lite, border: `1px solid ${T.border}`, color: T.text }}
                  disabled={uploading}
                />
              </div>
              <p className="text-xs mt-1.5" style={{ color: T.dim }}>
                Cashback is calculated based on venue's cashback percentage
              </p>
            </div>

            {/* Submit row */}
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: T.lite, color: T.muted }}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={submitBill}
                className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50 transition"
                style={{ backgroundColor: T.gold, color: '#0d0d0d' }}
                disabled={uploading || !billFile || !billAmount}
              >
                {uploading ? 'Uploading…' : 'Submit Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};
