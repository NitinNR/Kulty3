import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, UserPlus, Trash2, Mail, CheckCircle,
  AlertCircle, Lock, ImagePlus, X, Plus,
} from 'lucide-react';
import { getMyVenue, updateVenue, addVenueStaff, removeVenueStaff } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/common/Spinner';

const CATEGORIES = ['restaurant', 'club', 'spa', 'cafe', 'lounge', 'bar', 'other'];
const MAX_PHOTOS = 5;

// Compress a File to a base64 JPEG (max 1200px, 80% quality)
const compressToBase64 = (file) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1200;
      let { naturalWidth: w, naturalHeight: h } = img;
      const r = Math.min(MAX / w, MAX / h, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(w * r);
      canvas.height = Math.round(h * r);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.80));
    };
    img.src = URL.createObjectURL(file);
  });

export const VenueSettingsPage = () => {
  const [venue, setVenue]                   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [form, setForm]                     = useState({});
  const [saving, setSaving]                 = useState(false);
  const [saveError, setSaveError]           = useState('');
  const [saved, setSaved]                   = useState(false);
  const [staffEmail, setStaffEmail]         = useState('');
  const [addingStaff, setAddingStaff]       = useState(false);
  const [staffError, setStaffError]         = useState('');
  const [removingStaff, setRemovingStaff]   = useState(null);
  const [isOwner, setIsOwner]               = useState(false);
  const [benefitInput, setBenefitInput]     = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    getMyVenue()
      .then((res) => {
        const venues = res.data?.venues || [];
        const owned = venues.find((v) => v.ownerId === profile?._id || v.ownerId?._id === profile?._id);
        const v = owned || venues[0];
        if (v) {
          setVenue(v);
          setIsOwner(!!owned || venues.length === 1);
          setForm({
            name:               v.name || '',
            description:        v.description || '',
            category:           v.category || 'restaurant',
            address:            v.address || '',
            city:               v.city || '',
            cashbackPercentage: v.cashbackPercentage || 0,
            images:             v.images || [],
            memberBenefits:     v.memberBenefits || [],
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

  // ── Photo handlers ──────────────────────────────────────────────────────────
  const handlePhotoFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const slots = MAX_PHOTOS - form.images.length;
    if (slots <= 0) return;
    setUploadingPhoto(true);
    try {
      const compressed = await Promise.all(files.slice(0, slots).map(compressToBase64));
      setForm((f) => ({ ...f, images: [...f.images, ...compressed].slice(0, MAX_PHOTOS) }));
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (idx) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));

  // ── Benefit handlers ────────────────────────────────────────────────────────
  const handleAddBenefit = () => {
    const b = benefitInput.trim();
    if (!b || form.memberBenefits.includes(b)) return;
    setForm((f) => ({ ...f, memberBenefits: [...f.memberBenefits, b] }));
    setBenefitInput('');
  };

  const handleRemoveBenefit = (idx) =>
    setForm((f) => ({ ...f, memberBenefits: f.memberBenefits.filter((_, i) => i !== idx) }));

  // ── Staff handlers ──────────────────────────────────────────────────────────
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
      setStaffError(
        msg === 'Not your venue'
          ? 'Only the venue owner can manage staff.'
          : msg,
      );
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

  // ── Loading / empty states ──────────────────────────────────────────────────
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

        {/* ════════════════════════════════════════════
            VENUE DETAILS
        ════════════════════════════════════════════ */}
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
              { label: 'Venue Name',            key: 'name',               type: 'text'   },
              { label: 'City',                  key: 'city',               type: 'text'   },
              { label: 'Address',               key: 'address',            type: 'text'   },
              { label: 'Cashback % for members',key: 'cashbackPercentage', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key] ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, [key]: type === 'number' ? Number(e.target.value) : e.target.value })
                  }
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

        {/* ════════════════════════════════════════════
            ATMOSPHERE PHOTOS
        ════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-base font-bold text-gray-900">Atmosphere Photos</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {form.images?.length || 0} / {MAX_PHOTOS}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-5">
            Upload up to {MAX_PHOTOS} photos that showcase your venue's vibe. These appear in the member gallery.
          </p>

          {/* Photo grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {(form.images || []).map((src, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemovePhoto(idx)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
                {/* Index label */}
                <div className="absolute bottom-1.5 left-1.5 text-xs font-bold text-white/70">
                  {idx === 0 ? 'Cover' : `#${idx + 1}`}
                </div>
              </div>
            ))}

            {/* Add photo button */}
            {(form.images?.length || 0) < MAX_PHOTOS && (
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-xs font-medium">Add Photo</span>
                  </>
                )}
              </button>
            )}
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handlePhotoFiles}
          />

          {(form.images?.length || 0) > 0 && (
            <p className="text-xs text-gray-400">
              First photo is used as the cover image in venue listings.
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {saving ? <><Spinner size="sm" /> Saving...</> : 'Save Photos'}
          </button>
        </div>

        {/* ════════════════════════════════════════════
            MEMBER BENEFITS
        ════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-1">Member Benefits</h2>
          <p className="text-xs text-gray-400 mb-5">
            Add exclusive perks your venue offers to Kulty members. These show on your venue page.
          </p>

          {/* Existing benefits */}
          {(form.memberBenefits?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {form.memberBenefits.map((benefit, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1.5 text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-full px-3 py-1.5"
                >
                  {benefit}
                  <button
                    onClick={() => handleRemoveBenefit(idx)}
                    className="text-amber-500 hover:text-amber-700 transition flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add benefit input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={benefitInput}
              onChange={(e) => setBenefitInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBenefit()}
              placeholder="e.g. Complimentary welcome drink"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              onClick={handleAddBenefit}
              disabled={!benefitInput.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {saving ? <><Spinner size="sm" /> Saving...</> : 'Save Benefits'}
          </button>
        </div>

        {/* ════════════════════════════════════════════
            STAFF ACCESS
        ════════════════════════════════════════════ */}
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
                    >
                      {removingStaff === email ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-xl">
              <p className="text-2xl mb-2">👥</p>
              <p className="text-sm text-gray-500">No staff added yet</p>
              {isOwner && <p className="text-xs text-gray-400 mt-1">Add a staff member above to get started</p>}
            </div>
          )}

          {isOwner && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>How it works:</strong> When staff sign into Kulty with their email, they automatically get scanner and entry access. No separate invite needed.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
