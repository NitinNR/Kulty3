import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, Clock, XCircle, ArrowLeft } from 'lucide-react';
import { submitApplication, getMyApplication } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';

const CATEGORIES = ['restaurant', 'club', 'spa', 'cafe', 'lounge', 'bar', 'other'];

const EMPTY = {
  businessName: '', category: 'restaurant', description: '',
  city: '', address: '', contactPhone: '', cashbackPercentage: 0,
};

export const ApplyVenueOwnerPage = () => {
  const [form, setForm] = useState(EMPTY);
  const [existing, setExisting] = useState(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getMyApplication()
      .then((res) => setExisting(res.data))
      .catch(() => setExisting(null));
  }, []);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.businessName.trim() || !form.city.trim()) {
      setError('Business name and city are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await submitApplication(form);
      setExisting(res.data);
      setDone(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Submission failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (existing === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    );
  }

  // Show status if already applied
  if (existing) {
    const statusIcon = {
      pending: <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />,
      approved: <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />,
      rejected: <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />,
    };
    const statusConfig = {
      pending: {
        title: 'Application Under Review',
        desc: 'Your application has been submitted and is awaiting admin approval.',
        subDesc: 'This usually takes 24–48 hours. You\'ll be able to access the venue portal once approved.',
        color: 'text-amber-600',
      },
      approved: {
        title: 'Application Approved!',
        desc: 'Your venue owner account is now active.',
        subDesc: 'Sign in to access your venue portal and complete your venue setup.',
        color: 'text-green-600',
      },
      rejected: {
        title: 'Application Not Approved',
        desc: existing.rejectionReason
          ? `Reason: ${existing.rejectionReason}`
          : 'Your application was not approved at this time.',
        subDesc: 'You can update your details and submit a new application.',
        color: 'text-red-600',
      },
    };

    const cfg = statusConfig[existing.status];

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          {statusIcon[existing.status]}

          <h2 className="text-2xl font-bold text-gray-900 mb-2">{cfg.title}</h2>
          <p className={`text-sm font-medium mb-1 ${cfg.color}`}>{cfg.desc}</p>
          <p className="text-sm text-gray-400 mb-2">{cfg.subDesc}</p>

          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-xs text-gray-400 mb-0.5">Application for</p>
            <p className="font-semibold text-gray-900">{existing.businessName}</p>
            <p className="text-xs text-gray-500">{existing.city} · {existing.category}</p>
          </div>

          {existing.status === 'approved' && (
            <button
              onClick={() => navigate('/venue', { replace: true })}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition"
            >
              Go to Venue Portal
            </button>
          )}

          {existing.status === 'rejected' && (
            <button
              onClick={() => setExisting(null)}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition"
            >
              Submit New Application
            </button>
          )}

          {existing.status === 'pending' && (
            <p className="text-xs text-gray-400 mt-2">
              Please check back later or contact support if you have questions.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Apply as Venue Owner</h1>
              <p className="text-sm text-gray-500">Submit your venue details for admin review</p>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {done && (
            <div className="mb-5 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Application submitted! Admin will review shortly.
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <input
                type="text"
                value={form.businessName}
                onChange={(e) => set('businessName', e.target.value)}
                placeholder="e.g. The Grand Lounge"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="e.g. Mumbai"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Street address"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => set('contactPhone', e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cashback % offered to members</label>
              <input
                type="number"
                min="0" max="100"
                value={form.cashbackPercentage}
                onChange={(e) => set('cashbackPercentage', Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Tell us about your venue..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {submitting ? <Spinner size="sm" /> : 'Submit Application'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Applications are reviewed by our team within 24–48 hours.
        </p>
      </div>
    </div>
  );
};
