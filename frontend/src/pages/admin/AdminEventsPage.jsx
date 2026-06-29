import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, X } from 'lucide-react';
import { getAdminEvents, getAdminVenues, createEvent, updateEvent, deleteEvent } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { Pagination } from '../../components/common/Pagination';
import { format } from 'date-fns';

const STATUSES = ['upcoming', 'ongoing', 'past'];
const LIMIT = 20;

const EMPTY_FORM = {
  title: '', description: '', venueId: '', date: '', time: '',
  ticketPrice: 0, capacity: '', status: 'upcoming', bannerImage: '',
};

export const AdminEventsPage = () => {
  const [events,  setEvents]  = useState([]);
  const [venues,  setVenues]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [filter,  setFilter]  = useState('');
  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [editId,  setEditId]  = useState(null);
  const navigate = useNavigate();

  const load = async (pg = 1, status = '') => {
    setLoading(true);
    try {
      const params = { page: pg, limit: LIMIT };
      if (status) params.status = status;
      const [eventsRes, venuesRes] = await Promise.all([
        getAdminEvents(params),
        getAdminVenues({ limit: 100 }),
      ]);
      setEvents(eventsRes.data?.events || []);
      setTotal(eventsRes.data?.total || 0);
      setVenues(venuesRes.data?.venues || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page, filter); }, [page, filter]);

  const openAdd  = () => { setForm(EMPTY_FORM); setEditId(null); setModal('add'); };
  const openEdit = (event) => {
    setForm({
      title: event.title || '', description: event.description || '',
      venueId: event.venueId?._id || event.venueId || '',
      date: event.date ? event.date.split('T')[0] : '',
      time: event.time || '', ticketPrice: event.ticketPrice || 0,
      capacity: event.capacity || '', status: event.status || 'upcoming',
      bannerImage: event.bannerImage || '',
    });
    setEditId(event._id);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.venueId) return;
    setSaving(true);
    try {
      if (modal === 'add') {
        const res = await createEvent(form);
        setEvents((prev) => [res.data, ...prev]);
        setTotal((t) => t + 1);
      } else {
        const res = await updateEvent(editId, form);
        setEvents((prev) => prev.map((e) => (e._id === editId ? res.data : e)));
      }
      setModal(null);
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e._id !== id));
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
          <h1 className="text-lg sm:text-xl font-bold">Events</h1>
          <span className="text-gray-400 text-sm">{total} total</span>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-white text-gray-900 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Event</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {/* Status filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
          {[['', 'All'], ['upcoming', 'Upcoming'], ['ongoing', 'Live'], ['past', 'Past']].map(([val, label]) => (
            <button key={val} onClick={() => { setFilter(val); setPage(1); }}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === val ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}>
              {label}
            </button>
          ))}
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
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Event</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Venue</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Date</th>
                      <th className="text-left px-4 sm:px-6 py-3 text-gray-500 font-medium">Status</th>
                      <th className="px-4 sm:px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {events.map((event) => (
                      <tr key={event._id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4">
                          <p className="font-semibold text-gray-900">{event.title}</p>
                          <p className="text-xs text-gray-400">₹{event.ticketPrice}</p>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-gray-700">{event.venueId?.name || '—'}</td>
                        <td className="px-4 sm:px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                          {event.date ? format(new Date(event.date), 'dd MMM yyyy') : '—'}
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            event.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                            event.status === 'ongoing'  ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {event.status}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => openEdit(event)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                              <Pencil className="w-4 h-4 text-gray-500" />
                            </button>
                            <button onClick={() => handleDelete(event._id)} className="p-1.5 hover:bg-red-50 rounded-lg transition">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {events.length === 0 && (
                <div className="text-center py-12 text-gray-400">No events found.</div>
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
              <h2 className="text-lg font-bold">{modal === 'add' ? 'Add New Event' : 'Edit Event'}</h2>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            <div className="p-6 space-y-4">
              {[
                { label: 'Event Title *', key: 'title', type: 'text' },
                { label: 'Date', key: 'date', type: 'date' },
                { label: 'Time', key: 'time', type: 'text', placeholder: 'e.g. 7:00 PM' },
                { label: 'Ticket Price (₹)', key: 'ticketPrice', type: 'number' },
                { label: 'Capacity', key: 'capacity', type: 'number' },
                { label: 'Banner Image URL', key: 'bannerImage', type: 'text' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={form[key]} placeholder={placeholder}
                    onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue *</label>
                <select value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="">— Select venue —</option>
                  {venues.map((v) => <option key={v._id} value={v._id}>{v.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.venueId}
                className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition">
                {saving ? 'Saving...' : modal === 'add' ? 'Create Event' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
