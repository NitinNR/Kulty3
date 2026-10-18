import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Phone, Loader2, Check } from 'lucide-react';
import { getPublicSettings, updateSettings } from '../../services/api';
import { setAppAuthMethods } from '../../hooks/useAppSettings';

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative w-12 h-6 rounded-full transition disabled:opacity-50 ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : ''}`}
    />
  </button>
);

const METHOD_META = {
  google: { label: 'Google', desc: 'Continue with a Google account', icon: Globe },
  phone:  { label: 'Phone (OTP)', desc: 'Sign in with a mobile number and OTP', icon: Phone },
};

export const AdminSettingsPage = () => {
  const [authMethods, setAuthMethods] = useState({ google: true, phone: true });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getPublicSettings()
      .then((res) => setAuthMethods({
        google: res.data?.authMethods?.google !== false,
        phone: res.data?.authMethods?.phone !== false,
      }))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key) => {
    setSaved(false);
    setError('');
    setAuthMethods((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const noneEnabled = !authMethods.google && !authMethods.phone;

  const handleSave = async () => {
    if (noneEnabled) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await updateSettings({ authMethods });
      const next = {
        google: res.data?.authMethods?.google !== false,
        phone: res.data?.authMethods?.phone !== false,
      };
      setAuthMethods(next);
      setAppAuthMethods(next); // apply immediately on the login screens
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/admin')} className="hover:text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Login Settings</h1>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Sign-in methods</h2>
          <p className="text-xs text-gray-400 mb-4">
            Choose which sign-in options users see on the member and partner login screens. At least one must remain enabled.
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {Object.entries(METHOD_META).map(([key, { label, desc, icon: Icon }]) => (
                <div key={key} className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                  <Toggle
                    checked={authMethods[key]}
                    onChange={() => toggle(key)}
                    disabled={saving}
                  />
                </div>
              ))}
            </div>
          )}

          {noneEnabled && (
            <p className="text-amber-600 text-xs mt-3">
              At least one sign-in method must stay enabled.
            </p>
          )}
          {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
          {saved && (
            <p className="text-green-600 text-xs mt-3 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Settings saved
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={loading || saving || noneEnabled}
            className="mt-6 flex items-center justify-center gap-2 w-full px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-4 text-center">
          These settings apply to the member and partner login screens.
        </p>
      </div>
    </div>
  );
};
