import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Mail, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { getMyVenue, updateVenue, addVenueStaff, removeVenueStaff } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/common/Spinner';

const CATEGORIES = ['restaurant', 'club', 'spa', 'cafe', 'lounge', 'bar', 'other'];

export const VenueSettingsPage = () => {
  const [venue, setVenue]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [form, setForm]                 = useState({});
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState('');
  const [saved, setSaved]               = useState(false);
  const [staffEmail, setStaffEmail]     = useState('');
  const [addingStaff, setAddingStaff]   = useState(false);
  const [staffError, setStaffError]     = useState('');
  const [removingStaff, setRemovingStaff] = useState(null);
  const [isOwner, setIsOwner]           = useState(false);
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    getMyVenue()
      .then((res) => {
        const venues = res.data?.venues || [];
        // Pick the venue this user OWNS first; fall back to any venue they're staff of
        const owned = venues.find((v) => v.ownerId === profile?._id || v.ownerId?._id === profile?._id);
        const v = owned || venues[0];
        if (v) {
          setVenue(v);
          setIsOwner(!!owned || venues.length === 1); // treat as owner if only one venue (edge case)
          setForm({
            name:               v.name || '',
            description:        v.description || '',
            category:           v.category || 'restaurant',
            address:            v.address || '',
            city:               v.city || '',
            cashbackPercentage: v.cashbackPercentage || 0,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile]);

  const handleSave = async () => {
    setSaveError('');
    setSaving(true);
    try {
      const res = await updateVenue(venue._id, form);
      setVenue(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStaff = async () => {
    const email = staffEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    setStaffError('');
    setAddingStaff(true);
    try {
      const res = await addVenueStaff(venue._id, email);
      setVenue((v) => ({ ...v, staff: res.data.staff }));
      setStaffEmail('');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to add staff member.';
      if (msg === 'Not your venue') {
        setStaffError('Only the venue owner can manage staff. You are listed as staff here, not the owner.');
      } else {
        setStaffError(msg);
      }
    } finally {
      setAddingStaff(false);
    }
  };

  const handleRemoveStaff = async (email) => {
    setStaffError('');
    setRemovingStaff(email);
    try {
      const res = await removeVenueStaff(venue._id, email);
      setVenue((v) => ({ ...v, staff: res.data.staff }));
    } catch (err) {
      setStaffError(err.response?.data?.error || 'Failed to remove staff member.');
    } finally {
      setRemovingStaff(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🏢</p>
          <p className="text-gray-700 font-semibold mb-1">No venue found</p>
          <p className="text-gray-400 text-sm mb-4">You don't have a venue associated with your account.</p>
          <button onClick={() => navigate('/venue')} className="text-sm text-gray-600 underline">
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center gap-4 sticky top-0 z-30">
        <button onClick={() => navigate('/venue')} className="hover:text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold leading-none">Venue Settings</h1>
          <p className="text-xs text-gray-400 mt-0.5">{venue.name}</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

        {/* ── Venue Details ───────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-5">Venue Details</h2>

          {saved && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> Changes saved successfully.
            </div>
          )}
          {saveError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {saveError}
            </div>
          )}

          <div className="space-y-4">
            {[
              { label: 'Venue Name',    key: 'name',               type: 'text'   },
              { label: 'City',          key: 'city',               type: 'text'   },
              { label: 'Address',       key: 'address',            type: 'text'   },
              { label: 'Cashback % for members', key: 'cashbackPercentage', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key] ?? ''}
                  onChange={(e) => setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Tell members what makes your venue special..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-5 w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {saving ? <><Spinner size="sm" /> Saving...</> : 'Save Changes'}
          </button>
        </div>

        {/* ── Staff Management ────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-base font-bold text-gray-900">Staff Access</h2>
            {!isOwner && (
              <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                <Lock className="w-3 h-3" /> Staff only
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-5">
            {isOwner
              ? 'Add staff by their email. Once they sign in, they get scanner & entry access automatically.'
              : 'Only the venue owner can manage staff. Contact your venue owner to add or remove staff.'}
          </p>

          {staffError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {staffError}
            </div>
          )}

          {/* Add staff — only shown to owner */}
          {isOwner && (
            <div className="flex gap-2 mb-5">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStaff()}
                  placeholder="staff@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <button
                onClick={handleAddStaff}
                disabled={addingStaff || !staffEmail.includes('@')}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" />
                {addingStaff ? 'Adding...' : 'Add'}
              </button>
            </div>
          )}

          {/* Staff list */}
          {venue.staff?.length > 0 ? (
            <div className="space-y-2">
              {venue.staff.map((email) => (
                <div key={email} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {email[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700">{email}</span>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveStaff(email)}
                      disabled={removingStaff === email}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Remove staff"
                    >
                      {removingStaff === email ? (
                        <Spinner size="sm" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <p className="text-2xl mb-2">👥</p>
              <p className="text-sm text-gray-500">No staff added yet</p>
              {isOwner && (
                <p className="text-xs text-gray-400 mt-1">Add a staff member above to get started</p>
              )}
            </div>
          )}

          {isOwner && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>How it works:</strong> When a staff member signs into Kulty with their email, they automatically get venue owner access to the scanner and entry logs. No separate invite needed.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
