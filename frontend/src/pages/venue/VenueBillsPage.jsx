import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, ImageIcon } from 'lucide-react';
import { getMyVenue, getVenueEntries, approveBill } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { format } from 'date-fns';

export const VenueBillsPage = () => {
  const [bills, setBills] = useState([]); // flat list: { bill, entry, member }
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [updating, setUpdating] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const venueRes = await getMyVenue();
        const venues = venueRes.data?.venues || [];
        if (!venues.length) { setLoading(false); return; }
        const res = await getVenueEntries(venues[0]._id);
        const entries = Array.isArray(res.data) ? res.data : [];
        // Flatten all bills across entries
        const flat = [];
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

  const handleVerdict = async (entryId, billId, status) => {
    const key = `${entryId}-${billId}`;
    setUpdating(key);
    try {
      await approveBill(entryId, billId, { status });
      setBills((prev) =>
        prev.map((item) =>
          item.entryId === entryId && item.bill._id === billId
            ? { ...item, bill: { ...item.bill, status } }
            : item
        )
      );
    } catch (err) {
      alert('Failed to update bill: ' + (err.response?.data?.error || err.message));
    } finally {
      setUpdating(null);
    }
  };

  const filtered = bills.filter((b) =>
    filter === 'all' ? true : b.bill.status === filter
  );

  const counts = {
    all: bills.length,
    pending: bills.filter((b) => b.bill.status === 'pending').length,
    approved: bills.filter((b) => b.bill.status === 'approved').length,
    rejected: bills.filter((b) => b.bill.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/venue')} className="hover:text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Bill Approvals</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {['pending', 'approved', 'rejected', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 text-xs opacity-60">({counts[f]})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No {filter} bills</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(({ bill, entryId, member }) => {
              const key = `${entryId}-${bill._id}`;
              const isUpdating = updating === key;

              return (
                <div key={key} className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex items-start gap-4">
                    {/* Member info */}
                    <div className="flex items-center gap-3 flex-1">
                      {member?.profilePhoto ? (
                        <img src={member.profilePhoto} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                          {member?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{member?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">
                          {bill.uploadedAt ? format(new Date(bill.uploadedAt), 'dd MMM, hh:mm a') : ''}
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      bill.status === 'approved' ? 'bg-green-100 text-green-700' :
                      bill.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {bill.status}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4">
                    {/* Bill image thumbnail */}
                    {bill.imageUrl ? (
                      <button
                        onClick={() => setPreviewImage(bill.imageUrl)}
                        className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 hover:opacity-80 transition"
                      >
                        <img src={bill.imageUrl} alt="bill" className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-16 h-16 rounded-lg border border-dashed border-gray-200 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-gray-300" />
                      </div>
                    )}

                    <div className="flex-1">
                      <p className="text-2xl font-bold text-gray-900">₹{bill.amount}</p>
                    </div>

                    {/* Actions — only for pending */}
                    {bill.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerdict(entryId, bill._id, 'approved')}
                          disabled={isUpdating}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleVerdict(entryId, bill._id, 'rejected')}
                          disabled={isUpdating}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {bill.note && (
                    <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{bill.note}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} alt="Bill" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
};
