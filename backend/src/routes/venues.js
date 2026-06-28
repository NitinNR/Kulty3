import express from 'express';
import Venue from '../models/Venue.js';
import { authenticateToken, optionalAuth } from '../middleware/firebaseAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search, category, city, page = 1, limit = 20 } = req.query;
    const filter = { status: 'active' };

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
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
router.get('/my/venue', authenticateToken, requireRole(['venue_owner']), async (req, res) => {
  try {
    const email = req.userDoc.email?.toLowerCase();
    // Return venues where user is owner OR listed as staff
    const venues = await Venue.find({
      $or: [
        { ownerId: req.userDoc._id },
        { staff: email },
      ],
    });
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
    venue.staff.push(email.toLowerCase().trim());
    await venue.save();
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
    venue.staff = venue.staff.filter((e) => e !== decodeURIComponent(req.params.email));
    await venue.save();
    res.json({ message: 'Staff removed', staff: venue.staff });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove staff' });
  }
});

export default router;
