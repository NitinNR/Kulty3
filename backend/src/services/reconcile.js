import Payment from '../models/Payment.js';
import logger from '../config/logger.js';
import { getRazorpay, settleCapturedPayment } from './paymentSettlement.js';

/**
 * Recovery for payments captured by Razorpay but never activated here.
 *
 * Only matters when BOTH settlement paths failed: the browser closed before
 * /verify (Path A) AND the webhook never landed (Path B). The money is then
 * captured in Razorpay's account while the ledger row sits at `status: 'created'`.
 * This finds those rows, asks Razorpay what really happened, and settles them
 * through the same `settleCapturedPayment` used by /verify and the webhook — so
 * recovery produces byte-for-byte the same end state as a normal payment.
 *
 * Two entry points:
 *   - `reconcileForUser`         — lazily, when a member loads their history.
 *   - `reconcileStuckPayments`   — bulk, from the admin/cron endpoint.
 */

const stuckFilter = (cutoff) => ({ status: 'created', createdAt: { $lt: cutoff } });

/**
 * Settles a single stuck ledger row against Razorpay's record of the order.
 * @returns {Promise<{outcome: string, paymentId?: string, userId?: string}>}
 */
const settleOne = async (row, { rzp, dryRun }) => {
  // Razorpay is the source of truth for what actually happened to the order.
  const res = await rzp.orders.fetchPayments(row.razorpayOrderId);
  const payments = res?.items || [];
  const captured = payments.find((p) => p.status === 'captured');

  if (!captured) {
    const failed = payments.some((p) => p.status === 'failed');
    if (failed && !dryRun) {
      await Payment.updateOne(
        { _id: row._id, status: 'created' },
        { status: 'failed', failedAt: new Date(), $push: { events: { event: 'reconcile.failed', at: new Date() } } }
      );
    }
    return { outcome: failed ? 'marked_failed' : 'abandoned' };
  }

  if (dryRun) return { outcome: 'would_recover', paymentId: captured.id };

  // Rebuild a minimal payment entity shaped like the webhook payload so
  // recovery takes the exact same path as a normal payment.
  const result = await settleCapturedPayment({
    orderId: row.razorpayOrderId,
    payment: {
      id: captured.id,
      order_id: row.razorpayOrderId,
      amount: captured.amount,
      currency: captured.currency,
      created_at: captured.created_at,
    },
    via: 'admin',
  });

  return { outcome: result.action, paymentId: captured.id, userId: result.userId };
};

const runReconcile = async (rows, { dryRun = false } = {}) => {
  const summary = { scanned: rows.length, recovered: 0, abandoned: 0, errors: 0, details: [] };
  if (rows.length === 0) return summary;

  const rzp = getRazorpay();

  for (const row of rows) {
    try {
      const { outcome, paymentId, userId } = await settleOne(row, { rzp, dryRun });
      if (outcome === 'activated' || outcome === 'already_processed') {
        summary.recovered += 1;
        logger.warn('Reconcile: settled a stuck payment', {
          orderId: row.razorpayOrderId, paymentId, userId, outcome,
        });
      } else {
        summary.abandoned += 1;
      }
      summary.details.push({ orderId: row.razorpayOrderId, outcome, paymentId });
    } catch (err) {
      summary.errors += 1;
      summary.details.push({ orderId: row.razorpayOrderId, outcome: 'error', error: err.message });
      logger.error('Reconcile: order lookup failed', { orderId: row.razorpayOrderId, error: err.message });
    }
  }

  return summary;
};

/** Bulk scan of every user's stuck orders. Admin / cron only. */
export const reconcileStuckPayments = async ({ olderThanMinutes = 30, limit = 50, dryRun = false } = {}) => {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const rows = await Payment.find(stuckFilter(cutoff))
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
  return runReconcile(rows, { dryRun });
};

/**
 * Reconciliation scoped to one member. Deliberately bounded so it is safe to run
 * inline on a normal page load, and it never throws — recovery must not be able
 * to break payment history.
 *
 * Orders younger than `olderThanMinutes` are skipped: a fresh order is almost
 * always still in flight through /verify or the webhook.
 */
export const reconcileForUser = async (firebaseUid, { olderThanMinutes = 2, limit = 3 } = {}) => {
  try {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
    const rows = await Payment.find({ firebaseUid, ...stuckFilter(cutoff) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    if (rows.length === 0) return null;
    return await runReconcile(rows);
  } catch (err) {
    logger.error('reconcileForUser failed (non-fatal)', { firebaseUid, error: err.message });
    return null;
  }
};