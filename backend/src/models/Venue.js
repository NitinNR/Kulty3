import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: ['restaurant', 'club', 'spa', 'cafe', 'lounge', 'bar', 'other'],
    default: 'other'
  },
  address: String,
  city: String,
  coordinates: {
    latitude: Number,
    longitude: Number,
  },
  images: [String],
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String },
  },
  amenities: [String],
  cashbackPercentage: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Venue', venueSchema);
