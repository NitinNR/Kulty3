import express from 'express';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

router.get('/me', authenticateToken, async (req, res) => {
  try {
    let user = await User.findOne({ firebaseUid: req.user.uid });

    if (!user) {
      user = new User({
        firebaseUid: req.user.uid,
        email: req.user.email,
        phone: req.user.phone_number,
      });
      await user.save();
    }

    // Auto-promote to venue_owner if their email is in any venue's staff list
    if (user.role === 'user' && user.email) {
      const staffVenue = await Venue.findOne({ staff: user.email.toLowerCase() });
      if (staffVenue) {
        user.role = 'venue_owner';
        await user.save();
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      req.body,
      { new: true }
    );
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { role, subscription, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (subscription) filter['subscription.status'] = subscription;

    const users = await User.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({ users, total, page, limit });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
