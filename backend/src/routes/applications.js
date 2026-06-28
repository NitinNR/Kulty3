import express from 'express';
import VenueApplication from '../models/VenueApplication.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';

const router = express.Router();

// Submit application (any logged-in user)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Block if already pending or approved — allow reapply after rejection
    const existing = await VenueApplication.findOne({
      userId: req.userDoc._id,
      status: { $in: ['pending', 'approved'] },
    });
    if (existing) {
      return res.status(409).json({
        error: 'You already have an active application.',
        application: existing,
      });
    }

    const application = new VenueApplication({
      userId: req.userDoc._id,
      ...req.body,
    });
    await application.save();
    res.status(201).json(application);
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get own application status
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const application = await VenueApplication.findOne({ userId: req.userDoc._id })
      .sort({ createdAt: -1 });
    res.json(application || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

export default router;
