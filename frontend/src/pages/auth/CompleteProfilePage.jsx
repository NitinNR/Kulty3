import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { completeProfile } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Spinner } from '../../components/common/Spinner';

export const CompleteProfilePage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('dob', data.dob);
      if (photoFile) {
        formData.append('profilePhoto', photoFile);
      }

      await completeProfile(formData);
      navigate('/payment');
    } catch (err) {
      setError('Failed to complete profile. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Complete Profile</h1>
          <p className="text-gray-600 mb-8">We need a bit more info to get you started</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  as="span"
                  onClick={(e) => e.preventDefault()}
                >
                  Upload Photo
                </Button>
              </label>
            </div>

            <Input
              label="Full Name"
              {...register('name', { required: 'Name is required' })}
              error={errors.name?.message}
              placeholder="John Doe"
            />

            <Input
              label="Date of Birth"
              type="date"
              {...register('dob', { required: 'Date of birth is required' })}
              error={errors.dob?.message}
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
              variant="primary"
              size="lg"
            >
              {loading ? <Spinner size="sm" /> : 'Continue to Payment'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
