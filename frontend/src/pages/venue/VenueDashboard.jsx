import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, History, FileText, Settings, LogOut, Building2, Plus, CheckCircle } from 'lucide-react';
import { getMyVenue, createVenue, getMyApplication } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/common/Spinner';

const CATEGORIES = ['restaurant', 'club', 'spa', 'cafe', 'lounge', 'bar', 'other'];

// Shown when venue_owner has no venue yet — inline first-time setup
const VenueSetupForm = ({ prefill, onCreated }) => {
  const [form, setForm] = useState({
    name: prefill?.businessName || '',
    category: prefill?.category || 'restaurant',
    description: prefill?.description || '',
    city: prefill?.city || '',
    address: prefill?.address || '',
    cashbackPercentage: prefill?.cashbackPercentage || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim() || !form.city.trim()) {
      setError('Venue name and city are required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await createVenue(form);
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create venue. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Account Approved!</h2>
            <p className="text-xs text-gray-400">Set up your venue to get started</p>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6 mt-3">
          We've pre-filled this from your application. Review and confirm the details.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {[
            { label: 'Venue Name *', key: 'name', type: 'text', placeholder: 'e.g. The Grand Lounge' },
            { label: 'City *', key: 'city', type: 'text', placeholder: 'e.g. Mumbai' },
            { label: 'Address', key: 'address', type: 'text', placeholder: 'Street address' },
            { label: 'Cashback % for members', key: 'cashbackPercentage', type: 'number', placeholder: '0' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                value={form[key]}
                placeholder={placeholder}
                onChange={(e) => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
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
              onChange={(e) => set('description', e.target.value)}
              placeholder="Tell members what makes your venue special..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={saving}
          className="mt-6 w-full py-3.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
        >
          {saving ? <Spinner size="sm" /> : <Plus className="w-4 h-4" />}
          {saving ? 'Creating...' : 'Create My Venue'}
        </button>
      </div>
    </div>
  );
};

// Main dashboard shown once venue exists
const VenuePortal = ({ venue, onLogout }) => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Scan Member QR',
      desc: 'Scan a member card to log venue entry',
      icon: QrCode,
      path: '/venue/scanner',
      highlight: true,
    },
    {
      label: 'Entry Logs',
      desc: 'View all members who visited',
      icon: History,
      path: '/venue/entries',
    },
    {
      label: 'Bill Approvals',
      desc: 'Review and approve uploaded bills',
      icon: FileText,
      path: '/venue/bills',
    },
    {
      label: 'Venue Settings & Staff',
      desc: 'Edit venue details and manage staff',
      icon: Settings,
      path: '/venue/settings',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{venue.name}</h1>
          <p className="text-xs text-gray-400">{venue.city} · {venue.category}</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 grid grid-cols-1 gap-4">
        {actions.map(({ label, desc, icon: Icon, path, highlight }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`rounded-xl p-5 text-left flex items-start gap-4 transition shadow-sm ${
              highlight
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-white text-gray-900 hover:shadow-md'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              highlight ? 'bg-white bg-opacity-10' : 'bg-gray-100'
            }`}>
              <Icon className={`w-5 h-5 ${highlight ? 'text-white' : 'text-gray-600'}`} />
            </div>
            <div>
              <p className="font-semibold">{label}</p>
              <p className={`text-sm mt-0.5 ${highlight ? 'text-gray-400' : 'text-gray-500'}`}>
                {desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export const VenueDashboard = () => {
  const [venue, setVenue] = useState(null);       // null = no venue yet
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        const [venueRes, appRes] = await Promise.all([
          getMyVenue().catch(() => ({ data: { venues: [] } })),
          getMyApplication().catch(() => ({ data: null })),
        ]);
        const venues = venueRes.data?.venues || [];
        setVenue(venues.length > 0 ? venues[0] : null);
        setApplication(appRes.data || null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // No venue yet — show setup form (pre-filled from application)
  if (!venue) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5" />
            <h1 className="text-xl font-bold">Venue Portal</h1>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
        <VenueSetupForm
          prefill={application}
          onCreated={(v) => setVenue(v)}
        />
      </div>
    );
  }

  return <VenuePortal venue={venue} onLogout={logout} />;
};
