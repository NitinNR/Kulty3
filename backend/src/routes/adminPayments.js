import express from 'express';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { verifyIdToken } from '../services/firebaseAdmin.js';
import logger from '../config/logger.js';
import { safeEqual } from '../services/paymentSettlement.js';
import { reconcileStuckPayments } from '../services/reconcile.js';

const router = express.Router();

/**
 * Admin / cron surface for payment reconciliation. The recovery logic itself
 * lives in services/reconcile.js; this module only exposes it over HTTP.
 *
 * Auth accepts either:
 *   1. Vercel cron — `Authorization: Bearer <CRON_SECRET>`
 *   2. An admin    — Firebase token with role 'admin'
 */
const cronOrAdmin = async (req, res, next) => {
  const token = (req.headers.authorization || '').split(' ')[1];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && token && safeEqual(token, cronSecret)) {
    req.isCron = true;
    return next();
  }

  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = await verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    req.userDoc = user;
    next();
  } catch (err) {
    logger.error('reconcile auth error:', { error: err.message });
    res.status(401).json({ error: 'Invalid token' });
  }
};

/** GET so a cron can invoke it; POST for manual use. `?dryRun=true` to preview. */
const handle = async (req, res) => {
  try {
    const olderThanMinutes = Math.max(1, parseInt(req.query.olderThanMinutes ?? req.body?.olderThanMinutes ?? 30, 10) || 30);
    const limit            = Math.min(200, Math.max(1, parseInt(req.query.limit ?? req.body?.limit ?? 50, 10) || 50));
    const dryRun           = String(req.query.dryRun ?? req.body?.dryRun ?? '') === 'true';

    const summary = await reconcileStuckPayments({ olderThanMinutes, limit, dryRun });
    res.json({ ok: true, dryRun, olderThanMinutes, ...summary });
  } catch (err) {
    logger.error('reconcile error:', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Reconciliation failed' });
  }
};

router.get('/reconcile', cronOrAdmin, handle);
router.post('/reconcile', cronOrAdmin, handle);

/** Visibility for admins: what is currently stuck, without changing anything. */
router.get('/stuck', cronOrAdmin, async (req, res) => {
  try {
    const olderThanMinutes = Math.max(1, parseInt(req.query.olderThanMinutes ?? 30, 10) || 30);
    const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
    const rows = await Payment.find({ status: 'created', createdAt: { $lt: cutoff } })
      .select('razorpayOrderId firebaseUid amount currency plan createdAt')
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();
    res.json({ total: rows.length, olderThanMinutes, payments: rows });
  } catch (err) {
    logger.error('reconcile stuck error:', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to list stuck payments' });
  }
});

export default router;