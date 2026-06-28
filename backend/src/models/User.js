import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true },
  name: String,
  email: String,
  phone: String,
  profilePhoto: String,
  role: {
    type: String,
    enum: ['user', 'venue_owner', 'admin'],
    default: 'user'
  },
  membershipId: { type: String, unique: true, sparse: true },
  qrCodeData: String,
  subscription: {
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'inactive'
    },
    plan: String,
    startDate: Date,
    endDate: Date,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySubscriptionId: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
