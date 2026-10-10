import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import logger from '../config/logger.js';
import { isSubscriptionLive, nextTermStart, addYears } from '../utils/subscription.js';

/**
 * Shared Razorpay settlement primitives.
 *
 * Both the live routes (routes/payments.js) and recovery (routes/admin.js
 * reconcile) must grant memberships through exactly the same code path, or the
 * two can drift and disagree about who is entitled.
 */

export const CURRENCY = 'INR';

// Plan catalogue. Amounts are in paise and live server-side only — the amount
// a user is charged is never taken from the request body.
export const PLANS = {
  annual: { amount: 99900, years: 1, label: 'Annual Membership' },
};
export const DEFAULT_PLAN = 'annual';

let razorpay = null;
export const getRazorpay = () => {
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

/** For tests / config reloads. */
export const resetRazorpay = () => { razorpay = null; };

/**
 * Constant-time comparison for hex digests. A plain `!==` on an HMAC leaks
 * timing information about how many leading characters matched.
 */
export const safeEqual = (a = '', b = '') => {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/** Keeps an append-only audit trail from growing without bound. */
export const appendEvent = (paymentDoc, event, via) => {
  paymentDoc.events.push({ event, at: new Date(), activatedVia: via });
  if (paymentDoc.events.length > 50) paymentDoc.events.splice(0, paymentDoc.events.length - 50);
};

/**
 * Grants the membership. Idempotent — running it twice yields the same state.
 * This is the ONLY place a membership is activated.
 */
export const activateSubscription = (user, { orderId, paymentId, capturedAt, plan = DEFAULT_PLAN, via }) => {
  const planCfg = PLANS[plan] || PLANS[DEFAULT_PLAN];

  if (!user.membershipId) {
    // 12 hex chars of the ObjectId instead of 8 — 48 bits vs 32, which makes a
    // collision on the `unique` index vanishingly unlikely at signup volumes.
    user.membershipId = `KULTY${user._id.toString().slice(-12).toUpperCase()}`;
  }

  // Always refresh QR data on a new payment so old screenshots stop working.
  user.qrCodeData = crypto.randomUUID();

  const now = new Date();
  // Renewal-safe: extend from the existing endDate when still live so paid days
  // are never lost; otherwise start today.
  const startDate = nextTermStart(user.subscription, now);
  const endDate   = addYears(startDate, planCfg.years);

  user.subscription = {
    status:             'active',
    plan:               plan,
    startDate,
    endDate,
    razorpayOrderId:    orderId,
    razorpayPaymentId:  paymentId,
  };

  return user;
};

/**
 * Resolves the payer for an order.
 * Prefers the Payment ledger (stable per order); falls back to the legacy
 * `subscription.razorpayOrderId` field so orders created before the ledger
 * existed still settle instead of being dropped.
 */
export const resolveUserForOrder = async (orderId) => {
  const paymentDoc = await Payment.findOne({ razorpayOrderId: orderId });
  if (paymentDoc) {
    const user = paymentDoc.userId
      ? await User.findById(paymentDoc.userId)
      : await User.findOne({ firebaseUid: paymentDoc.firebaseUid });
    return { user, paymentDoc };
  }
  const user = await User.findOne({ 'subscription.razorpayOrderId': orderId });
  return { user, paymentDoc: null };
};

/**
 * Settles a payment that Razorpay reports as captured.
 *
 * Used by both the webhook and reconciliation, so recovery produces exactly the
 * same end state as a normal payment. Idempotent.
 *
 * @param {object} args
 * @param {string} args.orderId
 * @param {object} args.payment   Razorpay payment entity ({ id, amount, created_at, currency })
 * @param {'webhook'|'verify'|'admin'} args.via
 * @param {object} [args.user]    Pre-resolved user (skips the lookup)
 * @param {object} [args.paymentDoc] Pre-resolved ledger row
 * @returns {Promise<{action: string, userId?: string}>}
 */
export const settleCapturedPayment = async ({ orderId, payment, via, user, paymentDoc }) => {
  const amount = payment.amount;

  if (user === undefined || paymentDoc === undefined) {
    ({ user, paymentDoc } = await resolveUserForOrder(orderId));
  }
  if (!user) return { action: 'user_not_found' };

  const plan = paymentDoc?.plan || DEFAULT_PLAN;
  const planCfg = PLANS[plan] || PLANS[DEFAULT_PLAN];
  if (Number(amount) !== planCfg.amount) {
    logger.error('Settlement amount mismatch', { orderId, expected: planCfg.amount, got: amount });
    return { action: 'amount_mismatch' };
  }

  // Already applied through this same payment — nothing to do.
  if (
    user.subscription?.status === 'active' &&
    user.subscription?.razorpayPaymentId === payment.id &&
    paymentDoc?.status === 'captured'
  ) {
    return { action: 'already_processed', userId: String(user._id) };
  }

  activateSubscription(user, {
    orderId,
    paymentId:  payment.id,
    capturedAt: payment.created_at,
    plan,
    via,
  });
  await user.save();

  const capturedAt = new Date((payment.created_at || Math.floor(Date.now() / 1000)) * 1000);
  const ledger = paymentDoc || await Payment.create({
    razorpayOrderId: orderId,
    userId:          user._id,
    firebaseUid:     user.firebaseUid,
    amount,
    currency:        payment.currency || CURRENCY,
    plan,
    status:          'captured',
    capturedAt,
    activatedVia:    via,
  });

  if (ledger.status !== 'captured' || !ledger.razorpayPaymentId) {
    ledger.status            = 'captured';
    ledger.razorpayPaymentId = payment.id;
    ledger.capturedAt        = ledger.capturedAt || capturedAt;
    ledger.activatedVia      = ledger.activatedVia || via;
    appendEvent(ledger, 'payment.captured', via);
    await ledger.save();
  }

  return { action: 'activated', userId: String(user._id) };
};
