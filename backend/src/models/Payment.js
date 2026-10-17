import mongoose from 'mongoose';

/**
 * Immutable ledger of every Razorpay order/payment attempt.
 *
 * Why this exists: the webhook must be able to resolve "which user paid for
 * order X" even after the user has created several other orders. Previously
 * that lookup relied on `user.subscription.razorpayOrderId`, a single mutable
 * field that each new order overwrites — so a delayed webhook for an earlier
 * order found nobody. One document per order makes the lookup stable.
 */
const paymentSchema = new mongoose.Schema(
  {
    // Razorpay references
    razorpayOrderId:   { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, sparse: true },

    // Owner of the order (denormalised uid so the record survives user deletion)
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    firebaseUid: { type: String, required: true },

    // Money
    amount:   { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    plan:     { type: String, default: 'annual' },
    receipt:  String,

    // created → captured | failed | partially_refunded | refunded | disputed
    status: {
      type: String,
      enum: ['created', 'captured', 'failed', 'partially_refunded', 'refunded', 'disputed'],
      default: 'created',
    },

    capturedAt: Date,
    refundedAt: Date,
    failedAt:   Date,

    // Razorpay ids for post-payment events
    refundId:   String,
    disputeId:  String,

    // Which side completed it: 'verify' (browser) or 'webhook' (server-to-server)
    activatedVia: { type: String, enum: ['verify', 'webhook', 'admin'] },

    // Append-only audit trail of gateway events seen for this order
    events: [
      {
        event:     String,
        at:        { type: Date, default: Date.now },
        activatedVia: String,
      },
    ],
  },
  { timestamps: true }
);

// Indexes. `razorpayOrderId` (unique) and `razorpayPaymentId` (sparse) are
// already indexed by their field definitions, so they are not repeated here.
// "my payments" listing, and the admin reconcile scan.
paymentSchema.index({ firebaseUid: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);