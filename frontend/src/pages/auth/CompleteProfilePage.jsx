import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { completeProfile } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';

const T = {
  bg:     '#0d0d0d',
  card:   '#141414',
  lite:   '#1c1c1c',
  border: 'rgba(255,255,255,0.08)',
  text:   'rgba(255,255,255,0.88)',
  muted:  'rgba(255,255,255,0.4)',
  gold:   '#f59e0b',
};

const Field = ({ label, error, children }) => (
  <div className="w-full">
    {label && (
      <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.muted }}>
        {label}
      </label>
    )}
    {children}
    {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
  </div>
);

export const CompleteProfilePage = () => {
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoBase64,  setPhotoBase64]  = useState('');
  const photoInputRef = useRef(null);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
      setPhotoBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError('');
      await completeProfile({
        name: data.name,
        dob:  data.dob,
        profilePhoto: photoBase64 || '',
      });
      navigate('/choose-path', { replace: true });
    } catch (err) {
      setError('Failed to complete profile. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: T.lite,
    border: `1px solid ${T.border}`,
    color: T.text,
    borderRadius: '12px',
    padding: '12px 16px',
    width: '100%',
    fontSize: '14px',
    outline: 'none',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: T.bg }}>
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <span style={{ fontSize: '8px', color: 'rgba(245,158,11,0.55)', lineHeight: 1 }}>◆</span>
          <span className="font-display font-bold" style={{ fontSize: '20px', color: T.text, letterSpacing: '0.14em' }}>
            KULTY
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}>
          <h1 className="text-2xl font-bold mb-1" style={{ color: T.text }}>Complete your profile</h1>
          <p className="text-sm mb-8" style={{ color: T.muted }}>A few more details to get you started</p>

          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Photo upload */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full overflow-hidden group transition"
                style={{ backgroundColor: T.lite, border: `2px solid ${T.border}` }}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-8 h-8" style={{ color: T.muted }} />
                  </div>
                )}
                {/* Hover overlay */}
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                >
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="text-xs font-semibold transition hover:opacity-80"
                style={{ color: T.gold }}
              >
                {photoPreview ? 'Change photo' : 'Upload photo'}
              </button>
            </div>

            {/* Full name */}
            <Field label="Full Name" error={errors.name?.message}>
              <input
                style={inputStyle}
                placeholder="Your full name"
                {...register('name', { required: 'Name is required' })}
              />
            </Field>

            {/* Date of birth */}
            <Field label="Date of Birth" error={errors.dob?.message}>
              <input
                type="date"
                style={{ ...inputStyle, colorScheme: 'dark' }}
                {...register('dob', { required: 'Date of birth is required' })}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: T.gold, color: '#0d0d0d' }}
            >
              {loading ? <Spinner size="sm" /> : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
