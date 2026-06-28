import mongoose from 'mongoose';

const venueApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessName: { type: String, required: true },
  category: {
    type: String,
    enum: ['restaurant', 'club', 'spa', 'cafe', 'lounge', 'bar', 'other'],
    default: 'other',
  },
  description: String,
  city: String,
  address: String,
  contactPhone: String,
  cashbackPercentage: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('VenueApplication', venueApplicationSchema);
