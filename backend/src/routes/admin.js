import express from 'express';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import Event from '../models/Event.js';
import Entry from '../models/Entry.js';
import VenueApplication from '../models/VenueApplication.js';
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

// Applications — list all with optional status filter
router.get('/applications', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const applications = await VenueApplication.find(filter)
      .populate('userId', 'name email profilePhoto')
      .sort({ createdAt: -1 });
    const pending = await VenueApplication.countDocuments({ status: 'pending' });
    res.json({ applications, pending });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Approve application → promote user to venue_owner only (they set up venue themselves)
router.patch('/applications/:id/approve', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const application = await VenueApplication.findById(req.params.id).populate('userId');
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status === 'approved') {
      return res.status(409).json({ error: 'Application already approved' });
    }

    // Promote user to venue_owner — they will add their venue themselves
    const user = await User.findByIdAndUpdate(
      application.userId._id,
      { role: 'venue_owner' },
      { new: true }
    );

    application.status = 'approved';
    application.reviewedBy = req.userDoc._id;
    application.reviewedAt = new Date();
    await application.save();

    res.json({ message: 'Approved — user can now log in and create their venue', user, application });
  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

// Reject application
router.patch('/applications/:id/reject', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { reason } = req.body;
    const application = await VenueApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found' });

    application.status = 'rejected';
    application.rejectionReason = reason || '';
    application.reviewedBy = req.userDoc._id;
    application.reviewedAt = new Date();
    await application.save();

    res.json({ message: 'Rejected', application });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject application' });
  }
});

// Venues — all venues (including inactive) with owner info
router.get('/venues', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = search
      ? { $or: [{ name: new RegExp(search, 'i') }, { city: new RegExp(search, 'i') }] }
      : {};

    const [venues, total] = await Promise.all([
      Venue.find(filter).populate('ownerId', 'name email').skip(skip).limit(parseInt(limit)),
      Venue.countDocuments(filter),
    ]);
    res.json({ venues, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// Events — all events with venue info
router.get('/events', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = status ? { status } : {};

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate('venueId', 'name city')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Event.countDocuments(filter),
    ]);
    res.json({ events, total, page: parseInt(page), limit: parseInt(limit) });
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
          const b = bill.toObject();
          allBills.push({
            ...b,
            entryId: entry._id,
            userId: entry.userId,
            venueId: entry.venueId,
          });
        }
      });
    });

    allBills.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));

    const pg = parseInt(page, 10);
    const lim = parseInt(limit, 10);
    const paginated = allBills.slice((pg - 1) * lim, pg * lim);
    const total = allBills.length;

    res.json({ bills: paginated, total, page: pg, limit: lim });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

export default router;
