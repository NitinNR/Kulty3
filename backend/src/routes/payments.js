import express from 'express';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';
import crypto from 'crypto';
import logger from '../config/logger.js';
import { isSubscriptionLive } from '../utils/subscription.js';
import {
  PLANS,
  DEFAULT_PLAN,
  CURRENCY,
  getRazorpay,
  safeEqual,
  appendEvent,
  settleCapturedPayment,
} from '../services/paymentSettlement.js';
import { reconcileForUser } from '../services/reconcile.js';

const router = express.Router();

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Coerces whatever body parser produced into the exact bytes Razorpay signed.
 * `rawBody` is a Buffer when captured, but may be a string or already-parsed
 * object if middleware ordering changes — normalise all three.
 */
const rawBodyBuffer = (req) => {
  const { rawBody } = req;
  if (Buffer.isBuffer(rawBody)) return rawBody;
  if (typeof rawBody === 'string') return Buffer.from(rawBody, 'utf8');
  return null;
};

/** Simple in-memory throttle — enough to stop order-spam / verify brute force. */
const rateLimit = (windowMs, max) => {
  const hits = new Map();
  return (req, res, next) => {
    const key = req.user?.uid || req.ip;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
      if (entry.count > max) {
        logger.warn('payment rate limit hit', { key, path: req.path });
        return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
      }
    }
    // Opportunistic cleanup so the Map cannot grow without bound.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }
    next();
  };
};

// ── POST /payments/create-order ───────────────────────────────────────────────
router.post(
  '/create-order',
  authenticateToken,
  rateLimit(60_000, 10),
  async (req, res) => {
    try {
      const plan    = PLANS[req.body?.plan] ? req.body.plan : DEFAULT_PLAN;
      const planCfg = PLANS[plan];

      // req.user is a decoded Firebase token — it carries `uid`, not a Mongo
      // `_id`, so the local document is needed for the ledger's ref.
      const user = await User.findOne({ firebaseUid: req.user.uid });
      if (!user) return res.status(404).json({ error: 'User not found' });

      const rzp   = getRazorpay();
      const order = await rzp.orders.create({
        amount:          planCfg.amount,
        currency:        CURRENCY,
        receipt:         `rcpt_${Date.now()}`,
        payment_capture: 1,
        notes:           { firebaseUid: req.user.uid, plan },
      });

      // Write the ledger row FIRST — it is the only durable link between this
      // order and this user, and both /verify and the webhook depend on it.
      await Payment.create({
        razorpayOrderId: order.id,
        userId:          user._id,
        firebaseUid:     req.user.uid,
        amount:          order.amount,
        currency:        order.currency,
        plan,
        receipt:         order.receipt,
        status:          'created',
      });

      // Only mark the user pending when they are NOT already a live member.
      // Unconditionally writing 'pending' here used to revoke an active
      // membership the moment the renewal checkout opened.
      if (!isSubscriptionLive(user.subscription)) {
        user.subscription.status          = 'pending';
        user.subscription.razorpayOrderId = order.id;
        await user.save();
      }

      res.json({ id: order.id, amount: order.amount, currency: order.currency });
    } catch (err) {
      logger.error('create-order error:', { error: err.message, stack: err.stack });
      res.status(500).json({ error: 'Failed to create order' });
    }
  }
);

// ── POST /payments/verify ─────────────────────────────────────────────────────
// Called by the frontend Razorpay checkout handler after the user pays.
// Layer 1: HMAC signature (proves Razorpay generated this callback).
// Layer 2: live fetch from Razorpay (proves the money actually moved).
// Layer 3: ledger ownership (proves THIS user is the one who paid).
router.post(
  '/verify',
  authenticateToken,
  rateLimit(60_000, 20),
  async (req, res) => {
    try {
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return res.status(400).json({ error: 'Missing payment fields' });
      }
      if (!process.env.RAZORPAY_KEY_SECRET) {
        logger.error('RAZORPAY_KEY_SECRET not set — cannot verify payment');
        return res.status(503).json({ error: 'Payment verification unavailable' });
      }

      // ── Layer 1: HMAC signature ──────────────────────────────────────────
      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (!safeEqual(expected, razorpaySignature)) {
        logger.warn('verify: signature mismatch', { razorpayOrderId });
        return res.status(400).json({ error: 'Invalid payment signature' });
      }

      // ── Layer 2: live Razorpay state ─────────────────────────────────────
      const rzp     = getRazorpay();
      const payment = await rzp.payments.fetch(razorpayPaymentId);

      if (payment.status !== 'captured') {
        return res.status(400).json({ error: 'Payment not captured' });
      }
      if (payment.order_id !== razorpayOrderId) {
        return res.status(400).json({ error: 'Order ID mismatch' });
      }
      if (payment.currency !== CURRENCY) {
        return res.status(400).json({ error: 'Payment currency mismatch' });
      }

      // ── Layer 3: this order must belong to this user ─────────────────────
      // Without this check any signed-in user could replay another member's
      // (order_id, payment_id, signature) triple — which the payer's browser
      // receives in plaintext — and activate a free membership.
      const paymentDoc = await Payment.findOne({ razorpayOrderId });
      if (!paymentDoc) {
        logger.warn('verify: no ledger entry for order', { razorpayOrderId });
        return res.status(404).json({ error: 'Order not found' });
      }
      if (paymentDoc.firebaseUid !== req.user.uid) {
        logger.error('verify: order ownership mismatch', {
          razorpayOrderId,
          ownerUid: paymentDoc.firebaseUid,
          callerUid: req.user.uid,
        });
        return res.status(403).json({ error: 'Order does not belong to this account' });
      }

      const user = paymentDoc.userId
        ? await User.findById(paymentDoc.userId)
        : await User.findOne({ firebaseUid: req.user.uid });
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Settlement (amount check, activation, ledger) is shared with the
      // webhook and reconciliation so all three produce identical state.
      const result = await settleCapturedPayment({
        orderId: razorpayOrderId,
        payment,
        via: 'verify',
        user,
        paymentDoc,
      });

      if (result.action === 'amount_mismatch') {
        return res.status(400).json({ error: 'Payment amount mismatch' });
      }

      res.json({ message: 'Payment verified and subscription activated', action: result.action });
    } catch (err) {
      logger.error('verify error:', { error: err.message, stack: err.stack });
      res.status(500).json({ error: 'Failed to verify payment' });
    }
  }
);

// ── POST /payments/webhook ────────────────────────────────────────────────────
// Razorpay → our server. This is the AUTHORITATIVE settlement path: if the
// browser closes before /verify lands, the money is still captured here.
// Signature = HMAC-SHA256(raw request bytes, RAZORPAY_WEBHOOK_SECRET).
router.post('/webhook', async (req, res) => {
  // Any throw from here must surface as a non-2xx so Razorpay retries.
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // Previously this returned 200 {status:'ignored'}, which told Razorpay
      // "delivered fine" and silently discarded the event forever.
      logger.error('RAZORPAY_WEBHOOK_SECRET not set — webhook cannot be verified');
      return res.status(500).json({ status: 'error', message: 'Webhook secret not configured' });
    }

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature header' });
    }

    const body = rawBodyBuffer(req);
    if (!body) {
      logger.error('webhook: raw body unavailable — signature cannot be verified');
      return res.status(400).json({ error: 'Raw body unavailable' });
    }

    const expected = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
    if (!safeEqual(expected, signature)) {
      logger.warn('webhook: signature mismatch', {
        event: req.body?.event,
        path: req.originalUrl,
      });
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = req.body || {};
    const eventName = event.event;
    logger.info('Razorpay webhook event:', eventName);

    const entityOf = () => event.payload?.payment?.entity || {};

    // ── payment.captured — grant the membership ────────────────────────────
    // Only this event is authoritative. `order.paid` also fires and may arrive
    // before the money is actually captured, so it is acknowledged below
    // without granting anything.
    if (eventName === 'payment.captured') {
      const payment = entityOf();
      if (!payment?.id || !payment?.order_id) {
        return res.status(200).json({ status: 'ignored_event' });
      }

      const result = await settleCapturedPayment({
        orderId: payment.order_id,
        payment,
        via: 'webhook',
      });

      if (result.action === 'user_not_found') {
        // The order predates the ledger and belongs to no one we know.
        // Retrying cannot invent a user, so this must not loop.
        logger.error(`Webhook: no user found for orderId ${payment.order_id}`);
        return res.status(200).json({ status: 'user_not_found' });
      }
      if (result.action === 'amount_mismatch') {
        return res.status(200).json({ status: 'amount_mismatch' });
      }
      if (result.action === 'already_processed') {
        return res.status(200).json({ status: 'already_processed' });
      }

      logger.info(`Webhook activated subscription for user ${result.userId}`, {
        orderId: payment.order_id,
        paymentId: payment.id,
      });
      return res.status(200).json({ status: 'ok', action: 'activated' });
    }

    // ── payment.failed — record it, nothing to grant ───────────────────────
    if (eventName === 'payment.failed') {
      const payment = entityOf();
      if (payment?.order_id) {
        await Payment.findOneAndUpdate(
          { razorpayOrderId: payment.order_id },
          {
            status: 'failed',
            failedAt: new Date(),
            $push: { events: { event: eventName, at: new Date() } },
          }
        );
      }
      logger.warn('Webhook: payment failed', { orderId: payment?.order_id });
      return res.status(200).json({ status: 'ok', action: 'payment_failed' });
    }

    // ── refund.processed — revoke if the membership was paid for by it ─────
    if (eventName === 'refund.processed') {
      const refund  = event.payload?.refund?.entity || {};
      const payment = await Payment.findOne({ razorpayPaymentId: refund.payment_id });

      if (!payment) {
        logger.warn('Webhook: refund for unknown payment', { paymentId: refund.payment_id });
        return res.status(200).json({ status: 'ok', action: 'refund_unmatched' });
      }

      const isFullRefund = Number(refund.amount) === Number(payment.amount);
      // A partial refund must not clobber `captured` — the term is still valid.
      payment.status     = isFullRefund ? 'refunded' : 'partially_refunded';
      payment.refundId   = refund.id;
      payment.refundedAt = new Date();
      appendEvent(payment, eventName, 'webhook');
      await payment.save();

      const user = payment.userId
        ? await User.findById(payment.userId)
        : await User.findOne({ firebaseUid: payment.firebaseUid });

      if (!user) {
        return res.status(200).json({ status: 'ok', action: 'refund_recorded_no_user' });
      }

      // Only revoke when (a) the whole amount came back and (b) this payment
      // is still the one backing the live membership.
      if (isFullRefund && user.subscription?.razorpayPaymentId === refund.payment_id) {
        user.subscription.status = 'inactive';
        await user.save();
        logger.error('Webhook: membership revoked due to full refund', {
          userId: user._id,
          refundId: refund.id,
        });
        return res.status(200).json({ status: 'ok', action: 'refunded_and_revoked' });
      }

      if (!isFullRefund) {
        logger.warn('Webhook: partial refund recorded, membership retained', {
          paymentId: refund.payment_id,
          amount: refund.amount,
        });
        return res.status(200).json({ status: 'ok', action: 'refunded_partial' });
      }

      // Full refund of an older/superseded payment — the current term stands.
      logger.warn('Webhook: full refund for superseded payment, membership retained', {
        paymentId: refund.payment_id,
        activePaymentId: user.subscription?.razorpayPaymentId,
      });
      return res.status(200).json({ status: 'ok', action: 'refunded_superseded' });
    }

    // ── charge.dispute.created — revoke immediately ────────────────────────
    if (eventName === 'charge.dispute.created') {
      const dispute = event.payload?.dispute?.entity || {};
      const payment = await Payment.findOne({ razorpayPaymentId: dispute.payment_id });

      if (payment) {
        payment.status   = 'disputed';
        payment.disputeId = dispute.id;
        appendEvent(payment, eventName, 'webhook');
        await payment.save();

        const user = payment.userId
          ? await User.findById(payment.userId)
          : await User.findOne({ firebaseUid: payment.firebaseUid });

        if (user && user.subscription?.razorpayPaymentId === dispute.payment_id) {
          user.subscription.status = 'inactive';
          await user.save();
          logger.error('Webhook: membership revoked due to dispute', {
            userId: user._id,
            disputeId: dispute.id,
          });
        }
      }
      return res.status(200).json({ status: 'ok', action: 'disputed' });
    }

    // Unsubscribed event types are acknowledged so Razorpay stops retrying.
    return res.status(200).json({ status: 'ok', action: 'ignored_event' });
  } catch (err) {
    logger.error('webhook error:', { error: err.message, stack: err.stack });
    // Non-2xx on purpose: a 500 makes Razorpay retry, which is the only way a
    // transient DB blip gets fixed without losing a captured payment.
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── GET /payments/my — member-visible payment history ────────────────────────
// Reconciliation runs here because this is exactly when a member is about to
// look at their payments or retry checkout — so any stuck capture self-heals at
// the moment it matters, with no scheduler involved. Bounded and never throws.
router.get('/my', authenticateToken, async (req, res) => {
  try {
    await reconcileForUser(req.user.uid);

    const payments = await Payment.find({ firebaseUid: req.user.uid })
      .select('razorpayOrderId razorpayPaymentId amount currency plan status capturedAt createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ payments });
  } catch (err) {
    logger.error('payments/my error:', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

export default router;