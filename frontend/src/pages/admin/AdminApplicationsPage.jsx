import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, Building2 } from 'lucide-react';
import { getAdminApplications, approveApplication, rejectApplication } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { format } from 'date-fns';

export const AdminApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null); // application id
  const [rejectReason, setRejectReason] = useState('');
  const navigate = useNavigate();

  const load = (status = 'pending') => {
    setLoading(true);
    getAdminApplications(status ? { status } : {})
      .then((res) => setApplications(res.data?.applications || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load('pending'); }, []);

  const handleFilter = (f) => { setFilter(f); load(f); };

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      await approveApplication(id);
      setApplications((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    setProcessing(rejectModal);
    try {
      await rejectApplication(rejectModal, rejectReason);
      setApplications((prev) => prev.filter((a) => a._id !== rejectModal));
      setRejectModal(null);
      setRejectReason('');
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessing(null);
    }
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/admin')} className="hover:text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Venue Applications</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {['pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                filter === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No {filter} applications</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app._id} className="bg-white rounded-xl shadow-sm p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {app.userId?.profilePhoto ? (
                      <img src={app.userId.profilePhoto} alt={app.userId.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                        {app.userId?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{app.userId?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{app.userId?.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[app.status]}`}>
                    {app.status}
                  </span>
                </div>

                {/* Venue details */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900 text-lg">{app.businessName}</p>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full capitalize">{app.category}</span>
                  </div>
                  <p className="text-sm text-gray-600">{app.city}{app.address ? ` · ${app.address}` : ''}</p>
                  {app.description && <p className="text-sm text-gray-500">{app.description}</p>}
                  <div className="flex gap-4 text-xs text-gray-400 pt-1">
                    {app.contactPhone && <span>📞 {app.contactPhone}</span>}
                    {app.cashbackPercentage > 0 && <span>💰 {app.cashbackPercentage}% cashback offered</span>}
                    <span>Applied {format(new Date(app.createdAt), 'dd MMM yyyy')}</span>
                  </div>
                </div>

                {app.rejectionReason && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
                    Rejection reason: {app.rejectionReason}
                  </p>
                )}

                {/* Actions — only for pending */}
                {app.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(app._id)}
                      disabled={processing === app._id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {processing === app._id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => { setRejectModal(app._id); setRejectReason(''); }}
                      disabled={processing === app._id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject reason modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reject Application</h3>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional — will be shown to applicant)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing === rejectModal}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition"
              >
                {processing === rejectModal ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
