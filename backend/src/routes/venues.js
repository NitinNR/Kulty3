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

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Venue not found' });
    res.json(venue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch venue' });
  }
});

router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const venue = new Venue(req.body);
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

export default router;
