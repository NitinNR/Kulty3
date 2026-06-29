import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ImageIcon, Eye, X } from 'lucide-react';
import { getAllBills } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { Pagination } from '../../components/common/Pagination';
import { format } from 'date-fns';

const LIMIT = 20;

const statusColors = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export const AdminBillsPage = () => {
  const [bills,        setBills]        = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('');
  const [page,         setPage]         = useState(1);
  const [previewImage, setPreviewImage] = useState(null);
  const navigate = useNavigate();

  const load = async (pg = 1, status = '') => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (status) params.status = status;
      const res = await getAllBills(params);
      setBills(res.data?.bills || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page, filter); }, [page, filter]);

  const handleFilter = (f) => {
    setFilter(f);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-4 sm:px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/admin')} className="hover:text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg sm:text-xl font-bold">All Bills</h1>
        <span className="text-gray-400 text-sm ml-auto">{total} total</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
          {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => handleFilter(val)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
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
          <>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Member</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Venue</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Amount</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Date</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Status</th>
                      <th className="px-4 sm:px-6 py-3 text-gray-500 font-medium">Image</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bills.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4">
                          <p className="font-medium text-gray-900">{item.userId?.name || '—'}</p>
                          <p className="text-xs text-gray-400 font-mono">{item.userId?.membershipId}</p>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-gray-700">{item.venueId?.name || '—'}</td>
                        <td className="px-4 sm:px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">₹{item.amount}</td>
                        <td className="px-4 sm:px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                          {item.uploadedAt ? format(new Date(item.uploadedAt), 'dd MMM yyyy') : '—'}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-500'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center">
                          {item.imageUrl ? (
                            <button
                              onClick={() => setPreviewImage(item.imageUrl)}
                              className="inline-flex flex-col items-center gap-1 group"
                            >
                              <div className="w-14 h-10 rounded-lg overflow-hidden border border-gray-200 group-hover:border-gray-400 transition relative">
                                <img src={item.imageUrl} alt="bill" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition flex items-center justify-center">
                                  <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition" />
                                </div>
                              </div>
                              <span className="text-xs text-blue-600 group-hover:underline">View</span>
                            </button>
                          ) : (
                            <ImageIcon className="w-5 h-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
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

      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 flex items-center justify-center text-white transition"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={previewImage}
            alt="Bill"
            className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
