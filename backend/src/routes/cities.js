import express from 'express';
import City from '../models/City.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Public — returns sorted city names for the homepage filter
router.get('/', async (req, res) => {
  try {
    const cities = await City.find().sort({ name: 1 }).select('name -_id');
    res.json({ cities: cities.map((c) => c.name) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

// Admin — full list with IDs so the cities page can delete entries
router.get('/admin', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const cities = await City.find().sort({ name: 1 });
    res.json({ cities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

// Admin — add a city (idempotent: duplicate returns 409)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'City name is required' });

    const exists = await City.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (exists) return res.status(409).json({ error: 'City already exists' });

    const city = await City.create({ name });
    res.status(201).json({ city });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add city' });
  }
});

// Admin — remove a city
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    await City.findByIdAndDelete(req.params.id);
    res.json({ message: 'City removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove city' });
  }
});

export default router;
