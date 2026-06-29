import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, X, Search } from 'lucide-react';
import { getAdminVenues, createVenue, updateVenue, deleteVenue, getAllUsers } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { Pagination } from '../../components/common/Pagination';

const CATEGORIES = ['restaurant', 'club', 'spa', 'cafe', 'lounge', 'bar', 'other'];
const LIMIT = 20;

const EMPTY_FORM = {
  name: '', description: '', category: 'restaurant', address: '', city: '',
  cashbackPercentage: 0, status: 'active', ownerId: '',
};

export const AdminVenuesPage = () => {
  const [venues,  setVenues]  = useState([]);
  const [owners,  setOwners]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [editId,  setEditId]  = useState(null);
  const navigate = useNavigate();

  const load = async (pg = 1, q = '') => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (q) params.search = q;
      const [venueRes, userRes] = await Promise.all([
        getAdminVenues(params),
        getAllUsers({ role: 'venue_owner', limit: 100 }),
      ]);
      setVenues(venueRes.data?.venues || []);
      setTotal(venueRes.data?.total || 0);
      setOwners(userRes.data?.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(page, search), search ? 400 : 0);
    return () => clearTimeout(t);
  }, [page, search]);

  const openAdd  = () => { setForm(EMPTY_FORM); setEditId(null); setModal('add'); };
  const openEdit = (venue) => {
    setForm({
      name: venue.name || '', description: venue.description || '',
      category: venue.category || 'restaurant', address: venue.address || '',
      city: venue.city || '', cashbackPercentage: venue.cashbackPercentage || 0,
      status: venue.status || 'active', ownerId: venue.ownerId?._id || venue.ownerId || '',
    });
    setEditId(venue._id);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (modal === 'add') {
        const res = await createVenue(form);
        setVenues((prev) => [res.data, ...prev]);
        setTotal((t) => t + 1);
      } else {
        const res = await updateVenue(editId, form);
        setVenues((prev) => prev.map((v) => (v._id === editId ? res.data : v)));
      }
      setModal(null);
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this venue?')) return;
    try {
      await deleteVenue(id);
      setVenues((prev) => prev.filter((v) => v._id !== id));
      setTotal((t) => t - 1);
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="hover:text-gray-400 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold">Venues</h1>
          <span className="text-gray-400 text-sm">{total} total</span>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-white text-gray-900 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Venue</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search venues..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Venue</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Owner</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Cashback</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Status</th>
                      <th className="px-4 sm:px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {venues.map((venue) => (
                      <tr key={venue._id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4">
                          <p className="font-semibold text-gray-900">{venue.name}</p>
                          <p className="text-xs text-gray-400">{venue.city} · {venue.category}</p>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-gray-600 text-xs">
                          {venue.ownerId?.name || <span className="text-gray-300">Unassigned</span>}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-gray-700">{venue.cashbackPercentage}%</td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            venue.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {venue.status}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => openEdit(venue)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                              <Pencil className="w-4 h-4 text-gray-500" />
                            </button>
                            <button onClick={() => handleDelete(venue._id)} className="p-1.5 hover:bg-red-50 rounded-lg transition">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {venues.length === 0 && (
                <div className="text-center py-12 text-gray-400">No venues found.</div>
              )}
            </div>

            <Pagination page={page} total={total} limit={LIMIT} onChange={(p) => { setPage(p); window.scrollTo(0, 0); }} />
            {total > 0 && (
              <p className="text-center text-xs text-gray-400 mt-3">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
            )}
          </>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {modal === 'add' ? 'Add New Venue' : 'Edit Venue'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {[
                { label: 'Venue Name *', key: 'name', type: 'text' },
                { label: 'City', key: 'city', type: 'text' },
                { label: 'Address', key: 'address', type: 'text' },
                { label: 'Cashback %', key: 'cashbackPercentage', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Owner</label>
                <select value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="">— None —</option>
                  {owners.map((o) => <option key={o._id} value={o._id}>{o.name} ({o.email})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition">
                {saving ? 'Saving...' : modal === 'add' ? 'Create Venue' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
