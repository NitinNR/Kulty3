import express from 'express';
import Razorpay from 'razorpay';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';
import crypto from 'crypto';

const router = express.Router();

// Lazy initialize Razorpay when needed
let razorpay = null;

const getRazorpayInstance = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('❌ Razorpay keys not configured in .env');
      return null;
    }
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;
    const amount = plan === 'annual' ? 99900 : 0;

    const options = {
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    const rzp = getRazorpayInstance();
    if (!rzp) {
      return res.status(500).json({ error: 'Razorpay not configured' });
    }
    const order = await rzp.orders.create(options);

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid });

    // Generate human-readable membership ID
    if (!user.membershipId) {
      user.membershipId = `KULTY${user._id.toString().slice(-8).toUpperCase()}`;
    }

    // Generate a cryptographically unique QR code value (UUID v4)
    // This is different from membershipId — it's what gets encoded in the QR
    // Regenerate on each renewal so old screenshots/photos of the card stop working
    user.qrCodeData = crypto.randomUUID();

    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    user.subscription = {
      status: 'active',
      plan: 'annual',
      startDate: new Date(),
      endDate,
      razorpayOrderId,
      razorpayPaymentId,
    };

    await user.save();

    res.json({
      message: 'Payment verified',
      user,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

export default router;
