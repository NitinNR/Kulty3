import express from 'express';
import Razorpay from 'razorpay';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';
import crypto from 'crypto';

const router = express.Router();

const PLAN_AMOUNT = 99900; // ₹999 in paise

let razorpay = null;
const getRazorpay = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys not configured');
    }
    razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

// Helper — activate subscription on a user document (shared by /verify and webhook)
const activateSubscription = (user, { orderId, paymentId, capturedAt }) => {
  if (!user.membershipId) {
    user.membershipId = `KULTY${user._id.toString().slice(-8).toUpperCase()}`;
  }
  // Always refresh QR data on a new payment so old screenshots stop working
  user.qrCodeData = crypto.randomUUID();

  const startDate = capturedAt ? new Date(capturedAt * 1000) : new Date();
  const endDate   = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  user.subscription = {
    status:             'active',
    plan:               'annual',
    startDate,
    endDate,
    razorpayOrderId:    orderId,
    razorpayPaymentId:  paymentId,
  };
};

// ── POST /payments/create-order ───────────────────────────────────────────────
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const rzp   = getRazorpay();
    const order = await rzp.orders.create({
      amount:          PLAN_AMOUNT,
      currency:        'INR',
      receipt:         `rcpt_${Date.now()}`,
      payment_capture: 1,
    });

    // Store orderId on the user so the webhook can find them later
    await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      { 'subscription.razorpayOrderId': order.id, 'subscription.status': 'pending' }
    );

    res.json({ id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ── POST /payments/verify ─────────────────────────────────────────────────────
// Called by the frontend Razorpay checkout handler after user pays.
// Two-layer check: (1) HMAC signature, (2) live Razorpay API fetch.
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing payment fields' });
    }

    // ── Layer 1: HMAC signature (proves Razorpay generated this callback) ──
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expected !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // ── Layer 2: Fetch live payment from Razorpay API ──────────────────────
    const rzp     = getRazorpay();
    const payment = await rzp.payments.fetch(razorpayPaymentId);

    if (payment.status !== 'captured') {
      return res.status(400).json({ error: 'Payment not captured' });
    }
    if (payment.amount !== PLAN_AMOUNT) {
      return res.status(400).json({ error: 'Payment amount mismatch' });
    }
    if (payment.order_id !== razorpayOrderId) {
      return res.status(400).json({ error: 'Order ID mismatch' });
    }

    // ── Idempotency: already processed this exact payment ─────────────────
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (
      user.subscription?.status === 'active' &&
      user.subscription?.razorpayPaymentId === razorpayPaymentId
    ) {
      return res.json({ message: 'Already activated', user });
    }

    // ── Activate ───────────────────────────────────────────────────────────
    activateSubscription(user, {
      orderId:     razorpayOrderId,
      paymentId:   razorpayPaymentId,
      capturedAt:  payment.created_at,
    });
    await user.save();

    res.json({ message: 'Payment verified and subscription activated', user });
  } catch (err) {
    console.error('verify error:', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// ── POST /payments/webhook ────────────────────────────────────────────────────
// Razorpay → your server. Authoritative fallback — handles cases where the
// user's browser closed before the frontend handler could call /verify.
// Signature is HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET).
router.post('/webhook', async (req, res) => {
  try {
    const signature     = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not set — webhook ignored');
      return res.status(200).json({ status: 'ignored' });
    }
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature header' });
    }

    // req.rawBody is set by the express.json verify callback in server.js
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody)
      .digest('hex');

    if (expected !== signature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body;
    console.log('Razorpay webhook event:', event.event);

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId  = payment.order_id;
      const paymentId = payment.id;

      // Sanity-check amount
      if (payment.amount !== PLAN_AMOUNT) {
        console.warn(`Webhook amount mismatch: expected ${PLAN_AMOUNT}, got ${payment.amount}`);
        return res.status(200).json({ status: 'amount_mismatch' });
      }

      // Find the user by the orderId stored at create-order time
      const user = await User.findOne({ 'subscription.razorpayOrderId': orderId });
      if (!user) {
        console.warn(`Webhook: no user found for orderId ${orderId}`);
        return res.status(200).json({ status: 'user_not_found' });
      }

      // Idempotency
      if (
        user.subscription?.status === 'active' &&
        user.subscription?.razorpayPaymentId === paymentId
      ) {
        return res.status(200).json({ status: 'already_processed' });
      }

      activateSubscription(user, {
        orderId,
        paymentId,
        capturedAt: payment.created_at,
      });
      await user.save();
      console.log(`✅ Webhook activated subscription for user ${user._id}`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('webhook error:', err);
    // Always return 200 to Razorpay so it doesn't retry indefinitely
    res.status(200).json({ status: 'error', message: err.message });
  }
});

export default router;
