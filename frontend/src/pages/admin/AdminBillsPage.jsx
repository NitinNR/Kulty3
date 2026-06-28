import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImageIcon } from 'lucide-react';
import { getAllBills } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { format } from 'date-fns';

export const AdminBillsPage = () => {
  const [bills, setBills] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const navigate = useNavigate();

  const load = (status = '') => {
    setLoading(true);
    getAllBills(status ? { status, limit: 100 } : { limit: 100 })
      .then((res) => {
        setBills(res.data?.bills || []);
        setTotal(res.data?.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFilter = (f) => {
    setFilter(f);
    load(f);
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
        <h1 className="text-xl font-bold">All Bills</h1>
        <span className="text-gray-400 text-sm ml-auto">{total} total</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => handleFilter(val)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === val ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : bills.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No bills found.</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Member</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Venue</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Amount</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                  <th className="px-6 py-3 text-gray-500 font-medium">Image</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bills.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{item.userId?.name || '—'}</p>
                      <p className="text-xs text-gray-400 font-mono">{item.userId?.membershipId}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{item.venueId?.name || '—'}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">₹{item.amount}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {item.uploadedAt ? format(new Date(item.uploadedAt), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-500'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.imageUrl ? (
                        <button
                          onClick={() => setPreviewImage(item.imageUrl)}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition mx-auto block"
                        >
                          <img src={item.imageUrl} alt="bill" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <ImageIcon className="w-5 h-5 text-gray-200 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
