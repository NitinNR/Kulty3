import mongoose from 'mongoose';

const billSchema = new mongoose.Schema({
  imageUrl: String,
  amount: Number,
  uploadedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  note: String,
});

const entrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scannedAt: { type: Date, default: Date.now },
  bills: [billSchema],
  cashback: {
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'processed'],
      default: 'pending'
    },
    processedAt: Date,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Entry', entrySchema);
