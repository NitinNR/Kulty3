import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';

const router = express.Router();

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
    console.error('Bootstrap admin error:', error);
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
    console.error('Error completing profile:', error);
    res.status(500).json({ error: 'Failed to complete profile' });
  }
});

export default router;
