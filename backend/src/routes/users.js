import express from 'express';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import VenueApplication from '../models/VenueApplication.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import logger from '../config/logger.js';

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

    // Self-heal: a user tagged as venue owner who has a completed profile but
    // never actually submitted an application is treated as a regular member.
    if (user.intentRole === 'venue_owner' && user.name) {
      const application = await VenueApplication.findOne({ userId: user._id });
      if (!application) {
        user.intentRole = null;
        await user.save();
      }
    }

    // Auto-promote to venue_staff if email is in any venue's staff list
    if (user.role === 'user' && user.email) {
      const staffVenue = await Venue.findOne({ staff: user.email.toLowerCase() });
      if (staffVenue) {
        user.role = 'venue_staff';
        await user.save();
      }
    }

    res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', { error: error.message, stack: error.stack });
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
    logger.error('Error updating user:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ── Favorites ─────────────────────────────────────────────────────────────────

// GET /users/favorites/ids  — lightweight: just the array of favorited venue IDs
router.get('/favorites/ids', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid }).select('favorites');
    if (!user) return res.json({ ids: [] });
    res.json({ ids: user.favorites.map((id) => id.toString()) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch favorite IDs' });
  }
});

// GET /users/favorites  — paginated list of full venue objects
router.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const pg  = parseInt(page,  10);
    const lim = parseInt(limit, 10);

    const user = await User.findOne({ firebaseUid: req.user.uid }).select('favorites');
    if (!user) return res.json({ venues: [], total: 0, page: pg, limit: lim });

    const total  = user.favorites.length;
    const sliced = user.favorites.slice((pg - 1) * lim, pg * lim);

    const venues = await Venue.find({ _id: { $in: sliced }, status: 'active' });

    // preserve user's saved order
    const ordered = sliced
      .map((id) => venues.find((v) => v._id.toString() === id.toString()))
      .filter(Boolean);

    res.json({ venues: ordered, total, page: pg, limit: lim });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// POST /users/favorites/:venueId  — toggle (add / remove)
router.post('/favorites/:venueId', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const vid    = req.params.venueId;
    const exists = user.favorites.some((id) => id.toString() === vid);

    if (exists) {
      user.favorites = user.favorites.filter((id) => id.toString() !== vid);
    } else {
      user.favorites.push(vid);
    }

    await user.save();
    res.json({ favorited: !exists, total: user.favorites.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle favorite' });
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
    logger.error('Error fetching users:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
