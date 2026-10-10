/**
 * End-to-end webhook self-test.
 *
 * Proves the REAL settlement path works — signature verification, ledger
 * lookup, activation, and refund revocation — without going through Razorpay
 * or spending money. It seeds a throwaway user + order, fires correctly signed
 * webhooks at the running server, asserts the database changed, then deletes
 * everything it created.
 *
 * Usage:
 *   Terminal 1:  cd backend && npm run dev
 *   Terminal 2:  cd backend && npm run test:webhook
 *
 * Requires RAZORPAY_WEBHOOK_SECRET in backend/.env (same value the server uses).
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { connectDB } = await import('./src/config/db.js');
const { default: User } = await import('./src/models/User.js');
const { default: Payment } = await import('./src/models/Payment.js');

const PORT = process.env.PORT || 5000;
const URL = `http://localhost:${PORT}/api/payments/webhook`;
const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

const ORDER_ID = `order_SELFTEST_${Date.now()}`;
const PAYMENT_ID = `pay_SELFTEST_${Date.now()}`;
const UID = `selftest-${Date.now()}@kulty.invalid`;
const AMOUNT = 99900;

let pass = 0, fail = 0;
const check = (label, cond, detail = '') => {
  cond ? pass++ : fail++;
  console.log(`   ${cond ? 'PASS' : 'FAIL'}  ${label}${cond || !detail ? '' : `\n          ${detail}`}`);
};

const fire = async (event, entity, { signature, contentType = 'application/json' } = {}) => {
  const body = JSON.stringify(event === 'refund.processed'
    ? { event, payload: { refund: { entity } } }
    : event === 'charge.dispute.created'
      ? { event, payload: { dispute: { entity } } }
      : { event, payload: { payment: { entity } } });

  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': contentType, ...(signature ? { 'x-razorpay-signature': signature } : {}) },
    body,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const sign = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('hex');

const paymentEntity = (amount = AMOUNT) => ({
  id: PAYMENT_ID, order_id: ORDER_ID, amount, currency: 'INR', created_at: Math.floor(Date.now() / 1000),
});

(async () => {
  if (!SECRET) {
    console.error('\nRAZORPAY_WEBHOOK_SECRET is not set in backend/.env — cannot test.');
    console.error('Add it, restart the server, then re-run.\n');
    process.exit(1);
  }

  await connectDB();
  console.log(`\nTarget: ${URL}\n`);

  let user;
  try {
    user = await User.create({
      firebaseUid: UID,
      name: 'Webhook Self Test',
      email: UID,
      subscription: { status: 'inactive', plan: 'annual' },
    });
    await Payment.create({
      razorpayOrderId: ORDER_ID, userId: user._id, firebaseUid: UID,
      amount: AMOUNT, currency: 'INR', plan: 'annual', status: 'created',
    });
    console.log(`Seeded user ${user._id} + order ${ORDER_ID}\n`);

    // ── 1. signature rejection ────────────────────────────────────────────
    console.log('1. Unsigned / forged webhooks must be rejected');
    check('no signature header -> 400', (await fire('payment.captured', paymentEntity(), {})).status === 400);
    check('wrong signature -> 400',
      (await fire('payment.captured', paymentEntity(), { signature: 'f'.repeat(64) })).status === 400);

    // Sign one body, send a different one — the signature must not validate.
    const signedBody = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: paymentEntity() } } });
    const sentBody   = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: paymentEntity(1) } } });
    check('signature over a different body -> 400',
      (await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': sign(signedBody) }, body: sentBody })).status === 400);

    // ── 2. activation ──────────────────────────────────────────────────────
    console.log('\n2. A correctly signed payment.captured must activate the membership');
    const captured = await fire('payment.captured', paymentEntity(), { signature: sign(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: paymentEntity() } } })) });
    let u = await User.findById(user._id);
    check('webhook accepted (200)', captured.status === 200, `got ${captured.status} ${JSON.stringify(captured.body)}`);
    check('subscription.status === active', u.subscription.status === 'active');
    check('membershipId assigned', !!u.membershipId);
    check('qrCodeData rotated', !!u.qrCodeData);
    const ledger = await Payment.findOne({ razorpayOrderId: ORDER_ID });
    check('ledger marked captured', ledger.status === 'captured');
    check('ledger records activatedVia=webhook', ledger.activatedVia === 'webhook');

    // ── 3. idempotency ─────────────────────────────────────────────────────
    console.log('\n3. Redelivery must not double-apply');
    const qrBefore = u.qrCodeData;
    const again = await fire('payment.captured', paymentEntity(), { signature: sign(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: paymentEntity() } } })) });
    u = await User.findById(user._id);
    check('redelivery -> already_processed', again.body.status === 'already_processed', JSON.stringify(again.body));
    check('QR not rotated twice', u.qrCodeData === qrBefore);

    // ── 4. amount mismatch ─────────────────────────────────────────────────
    console.log('\n4. A tampered amount must not grant membership');
    const bad = await fire('payment.captured', paymentEntity(100), { signature: sign(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: paymentEntity(100) } } })) });
    check('amount mismatch -> amount_mismatch', bad.body.status === 'amount_mismatch', JSON.stringify(bad.body));
    u = await User.findById(user._id);
    check('membership untouched by bad amount', u.subscription.status === 'active');

    // ── 5. refund revokes ──────────────────────────────────────────────────
    console.log('\n5. A full refund must revoke the membership');
    const refundEntity = { id: `rfnd_${Date.now()}`, payment_id: PAYMENT_ID, amount: AMOUNT };
    const refund = await fire('refund.processed', refundEntity, { signature: sign(JSON.stringify({ event: 'refund.processed', payload: { refund: { entity: refundEntity } } })) });
    u = await User.findById(user._id);
    check('refund accepted (200)', refund.status === 200, JSON.stringify(refund.body));
    check('membership revoked', u.subscription.status === 'inactive', `status=${u.subscription.status}`);
    const led2 = await Payment.findOne({ razorpayOrderId: ORDER_ID });
    check('ledger marked refunded', led2.status === 'refunded');

    // ── 6. non-JSON content type still verifies ────────────────────────────
    console.log('\n6. Verification must not depend on Content-Type');
    const l1 = await Payment.findOne({ razorpayOrderId: ORDER_ID });
    l1.status = 'captured'; l1.razorpayPaymentId = null;
    await l1.save();
    const txt = await fire('payment.captured', paymentEntity(), {
      contentType: 'text/plain;charset=UTF-8',
      signature: sign(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: paymentEntity() } } })),
    });
    check('text/plain webhook still verifies', txt.status === 200, `got ${txt.status} ${JSON.stringify(txt.body)}`);
    u = await User.findById(user._id);
    check('membership re-activated via text/plain', u.subscription.status === 'active');

    console.log(`\n${fail === 0 ? 'ALL GREEN' : 'FAILURES PRESENT'} — ${pass} passed, ${fail} failed\n`);
  } catch (err) {
    console.error('\nTest aborted:', err.message, '\n');
    fail++;
  } finally {
    // Never leave test data behind.
    await Payment.deleteMany({ razorpayOrderId: ORDER_ID }).catch(() => {});
    if (user) await User.deleteOne({ _id: user._id }).catch(() => {});
    console.log('Cleaned up seeded test data.\n');
    process.exit(fail === 0 ? 0 : 1);
  }
})();