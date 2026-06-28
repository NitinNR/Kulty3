import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Mail } from 'lucide-react';
import { getMyVenue, updateVenue, addVenueStaff, removeVenueStaff } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';

const CATEGORIES = ['restaurant', 'club', 'spa', 'cafe', 'lounge', 'bar', 'other'];

export const VenueSettingsPage = () => {
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [staffEmail, setStaffEmail] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);
  const [removingStaff, setRemovingStaff] = useState(null);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getMyVenue()
      .then((res) => {
        const v = res.data?.venues?.[0];
        if (v) {
          setVenue(v);
          setForm({
            name: v.name || '',
            description: v.description || '',
            category: v.category || 'restaurant',
            address: v.address || '',
            city: v.city || '',
            cashbackPercentage: v.cashbackPercentage || 0,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateVenue(venue._id, form);
      setVenue(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleAddStaff = async () => {
    const email = staffEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    setAddingStaff(true);
    try {
      const res = await addVenueStaff(venue._id, email);
      setVenue((v) => ({ ...v, staff: res.data.staff }));
      setStaffEmail('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add staff');
    } finally {
      setAddingStaff(false);
    }
  };

  const handleRemoveStaff = async (email) => {
    setRemovingStaff(email);
    try {
      const res = await removeVenueStaff(venue._id, email);
      setVenue((v) => ({ ...v, staff: res.data.staff }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove staff');
    } finally {
      setRemovingStaff(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Spinner /></div>;
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>No venue assigned. Contact admin.</p>
          <button onClick={() => navigate('/venue')} className="mt-4 text-sm text-gray-600 underline">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/venue')} className="hover:text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Venue Settings</h1>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

        {/* Venue details */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Venue Details</h2>

          {saved && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Changes saved successfully.
            </div>
          )}

          <div className="space-y-4">
            {[
              { label: 'Venue Name', key: 'name', type: 'text' },
              { label: 'City', key: 'city', type: 'text' },
              { label: 'Address', key: 'address', type: 'text' },
              { label: 'Cashback %', key: 'cashbackPercentage', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key] ?? ''}
                  onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-5 w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Staff management */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Staff Access</h2>
          <p className="text-xs text-gray-400 mb-5">
            Add staff by their email. Once they sign in, they'll get access to the venue scanner and entry logs automatically.
          </p>

          {/* Add staff */}
          <div className="flex gap-2 mb-5">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStaff()}
                placeholder="staff@email.com"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <button
              onClick={handleAddStaff}
              disabled={addingStaff || !staffEmail.includes('@')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
            >
              <UserPlus className="w-4 h-4" />
              {addingStaff ? '...' : 'Add'}
            </button>
          </div>

          {/* Staff list */}
          {venue.staff && venue.staff.length > 0 ? (
            <div className="space-y-2">
              {venue.staff.map((email) => (
                <div key={email} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                      {email[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700">{email}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveStaff(email)}
                    disabled={removingStaff === email}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No staff added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
