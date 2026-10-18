import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';
import { createCustomToken } from '../services/firebaseAdmin.js';
import { verifyOtp, retryOtp, verifyAccessToken, isMsg91Configured } from '../services/msg91.js';
import logger from '../config/logger.js';

const router = express.Router();

const DEFAULT_COUNTRY_CODE = '91';

// Errors thrown by the MSG91 service carry a friendly message + `expose: true`.
// Anything else is unexpected and shouldn't leak its internals to the client.
const otpFailure = (error, fallback, defaultStatus = 500) => {
  const exposed = error?.expose === true;
  return {
    status: exposed ? error.status || 400 : defaultStatus,
    body: {
      error: exposed && error.message ? error.message : fallback,
      ...(exposed && error.code ? { code: error.code } : {}),
    },
  };
};

// MSG91 returns identifiers as plain digits (country code + number, no '+')
const normalizePhone = (identifier) => {
  let digits = String(identifier || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `${DEFAULT_COUNTRY_CODE}${digits}`;
  return digits;
};

// ── MSG91 OTP Widget: resend the OTP ─────────────────────────────────────────
// The widget is a "Custom" widget, so retrying requires an explicit channel
// (SMS = 11). The client sends the current reqId and receives the new one.
router.post('/msg91/retry', async (req, res) => {
  try {
    if (!isMsg91Configured()) {
      return res.status(503).json({ error: 'MSG91 is not configured on the server' });
    }

    const { reqId } = req.body || {};
    if (!reqId) {
      return res.status(400).json({ error: 'reqId is required' });
    }

    const { reqId: nextReqId } = await retryOtp(reqId);

    res.json({ message: 'OTP resent', reqId: nextReqId });
  } catch (error) {
    logger.error('MSG91 retry error:', { error: error.message });
    const { status, body } = otpFailure(error, 'Failed to resend OTP', 400);
    res.status(status).json(body);
  }
});

// ── MSG91 OTP Widget: verify OTP → issue a Firebase session ───────────────────
// We verify the OTP server-side with MSG91, exchange the returned access token
// for the verified phone number, match/create the user by phone, then mint a
// Firebase custom token the client exchanges via signInWithCustomToken().
router.post('/msg91/verify', async (req, res) => {
  try {
    const { reqId, otp } = req.body || {};

    if (!isMsg91Configured()) {
      return res.status(503).json({ error: 'MSG91 is not configured on the server' });
    }
    if (!reqId || !otp) {
      return res.status(400).json({ error: 'reqId and otp are required' });
    }

    const accessToken = await verifyOtp(reqId, otp);
    const { identifier } = await verifyAccessToken(accessToken);
    const phone = normalizePhone(identifier);

    if (!phone) {
      return res.status(400).json({ error: 'Invalid identifier returned by MSG91' });
    }

    // Reuse an existing account if the phone is already on file (with or
    // without a leading '+'); otherwise create a lightweight phone-only user.
    let user = await User.findOne({ phone: { $in: [phone, `+${phone}`] } });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = new User({
        firebaseUid: `msg91_${phone}`,
        phone,
      });
      await user.save();
    }

    const customToken = await createCustomToken(user.firebaseUid, { phone });

    res.json({
      message: 'Phone verified',
      customToken,
      phone,
      isNewUser,
      user: { id: user._id, name: user.name || '', phone: user.phone, role: user.role },
    });
  } catch (error) {
    logger.error('MSG91 verification error:', { error: error.message, stack: error.stack });
    const { status, body } = otpFailure(error, 'Phone verification failed');
    res.status(status).json(body);
  }
});

// One-time bootstrap: makes the calling user an admin if they know ADMIN_SECRET
router.post('/bootstrap-admin', authenticateToken, async (req, res) => {
  try {
    const { secret } = req.body;
    if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid secret' });
    }
    const user = await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      { role: 'admin' },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found. Complete profile first.' });
    res.json({ message: 'You are now an admin', user });
  } catch (error) {
    logger.error('Bootstrap admin error:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to set admin' });
  }
});

router.post('/complete-profile', authenticateToken, async (req, res) => {
  try {
    const { name, dob, profilePhoto } = req.body;
    const firebaseUid = req.user.uid;

    let user = await User.findOne({ firebaseUid });

    if (!user) {
      const email = req.user.email;
      const phone = req.user.phone_number;

      user = new User({
        firebaseUid,
        email,
        phone,
        name,
        dob,
        profilePhoto,
      });
    } else {
      user.name = name;
      user.profilePhoto = profilePhoto;
    }

    await user.save();

    res.json({
      message: 'Profile completed',
      user,
    });
  } catch (error) {
    logger.error('Error completing profile:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to complete profile' });
  }
});

export default router;
