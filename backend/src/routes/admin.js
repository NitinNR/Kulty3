import express from 'express';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import Event from '../models/Event.js';
import Entry from '../models/Entry.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeSubscriptions = await User.countDocuments({
      role: 'user',
      'subscription.status': 'active',
    });
    const totalVenues = await User.countDocuments({ role: 'venue_owner' });
    const totalEntries = await Entry.countDocuments();

    res.json({
      totalUsers,
      activeSubscriptions,
      totalVenues,
      totalEntries,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
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

router.get('/entries', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const entries = await Entry.find()
      .populate('userId', 'name email membershipId')
      .populate('venueId', 'name')
      .sort({ scannedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Entry.countDocuments();

    res.json({ entries, total, page, limit });
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Venues — all venues (including inactive) with owner info
router.get('/venues', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const venues = await Venue.find().populate('ownerId', 'name email');
    res.json({ venues });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// Events — all events with venue info
router.get('/events', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const events = await Event.find().populate('venueId', 'name city');
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.patch('/users/:id/role', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'venue_owner', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user, venue_owner, or admin.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Role updated', user });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.get('/bills', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    const entries = await Entry.find()
      .populate('userId', 'name email membershipId')
      .populate('venueId', 'name')
      .sort({ 'bills.uploadedAt': -1 });

    let allBills = [];
    entries.forEach((entry) => {
      entry.bills.forEach((bill) => {
        if (!status || bill.status === status) {
          allBills.push({
            ...bill,
            entryId: entry._id,
            userId: entry.userId,
            venueId: entry.venueId,
          });
        }
      });
    });

    const paginated = allBills.slice((page - 1) * limit, page * limit);
    const total = allBills.length;

    res.json({ bills: paginated, total, page, limit });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

export default router;
