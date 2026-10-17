import mongoose from 'mongoose';

// Singleton app configuration edited from the admin panel. Always stored under
// the fixed key 'global' so there is exactly one document.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    authMethods: {
      google: { type: Boolean, default: true },
      phone: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
