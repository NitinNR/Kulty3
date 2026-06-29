import express from 'express';
import Venue from '../models/Venue.js';
import User from '../models/User.js';
import { authenticateToken, optionalAuth } from '../middleware/firebaseAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, category, city, page = 1, limit = 20 } = req.query;
    const filter = { status: 'active' };

    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [
        { name: re },
        { description: re },
        { city: re },
        { address: re },
      ];
    }

    if (category && category !== 'All') {
      filter.category = category.toLowerCase();
    }

    if (city) filter.city = city;

    const venues = await Venue.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Venue.countDocuments(filter);

    res.json({ venues, total, page, limit });
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// Venue owner or staff fetches their venue(s)
// Also handles legacy staff whose role was set before venue_staff role existed
router.get('/my/venue', authenticateToken, async (req, res) => {
  try {
    const userDoc = await User.findOne({ firebaseUid: req.user.uid });
    if (!userDoc) return res.status(401).json({ error: 'User not found' });

    const email = userDoc.email?.toLowerCase();

    const venues = await Venue.find({
      $or: [
        { ownerId: userDoc._id },
        { staff: email },
      ],
    });

    // Lazy role upgrade: if user is in a venue's staff list but still has 'user' role, fix it
    if (userDoc.role === 'user' && venues.some((v) => v.staff?.includes(email))) {
      await User.findByIdAndUpdate(userDoc._id, { role: 'venue_staff' });
    }

    res.json({ venues });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch venue' });
  }
});

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    res.json(venue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch venue' });
  }
});

router.post('/', authenticateToken, requireRole(['admin', 'venue_owner']), async (req, res) => {
  try {
    const body = { ...req.body };
    // venue_owner can only create a venue for themselves — ignore any ownerId in body
    if (req.userDoc.role === 'venue_owner') {
      body.ownerId = req.userDoc._id;
    }
    const venue = new Venue(body);
    await venue.save();
    res.status(201).json(venue);
  } catch (error) {
    console.error('Error creating venue:', error);
    res.status(500).json({ error: 'Failed to create venue' });
  }
});

router.put('/:id', authenticateToken, requireRole(['admin', 'venue_owner']), async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    if (req.userDoc.role === 'venue_owner' && venue.ownerId.toString() !== req.userDoc._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    Object.assign(venue, req.body);
    await venue.save();
    res.json(venue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update venue' });
  }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const venue = await Venue.findByIdAndDelete(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    res.json({ message: 'Venue deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete venue' });
  }
});

// Add staff by email (venue owner only, for their own venue)
router.post('/:id/staff', authenticateToken, requireRole(['venue_owner']), async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    if (venue.ownerId.toString() !== req.userDoc._id.toString()) {
      return res.status(403).json({ error: 'Not your venue' });
    }
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (venue.staff.includes(email.toLowerCase())) {
      return res.status(409).json({ error: 'Staff member already added' });
    }
    const staffEmail = email.toLowerCase().trim();
    venue.staff.push(staffEmail);
    await venue.save();

    // Upgrade user's role to venue_staff so they can access scanner routes
    await User.findOneAndUpdate(
      { email: staffEmail },
      { $set: { role: 'venue_staff' } }
    );

    res.json({ message: 'Staff added', staff: venue.staff });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add staff' });
  }
});

// Remove staff by email
router.delete('/:id/staff/:email', authenticateToken, requireRole(['venue_owner']), async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    if (venue.ownerId.toString() !== req.userDoc._id.toString()) {
      return res.status(403).json({ error: 'Not your venue' });
    }
    const removedEmail = decodeURIComponent(req.params.email);
    venue.staff = venue.staff.filter((e) => e !== removedEmail);
    await venue.save();

    // Revert role to 'user' if this person is not staff at any other venue
    const stillStaff = await Venue.findOne({ staff: removedEmail });
    if (!stillStaff) {
      await User.findOneAndUpdate(
        { email: removedEmail },
        { $set: { role: 'user' } }
      );
    }

    res.json({ message: 'Staff removed', staff: venue.staff });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove staff' });
  }
});

export default router;
