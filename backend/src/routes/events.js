import express from 'express';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import { authenticateToken, optionalAuth } from '../middleware/firebaseAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import logger from '../config/logger.js';

const router = express.Router();

// ── helpers ──────────────────────────────────────────────────────────────────
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Derive the true status from the event date, so stale stored statuses
// (e.g. `upcoming`) can never keep a past event looking upcoming.
const effectiveStatus = (event) => {
  const stored = event.status || 'upcoming';
  if (!event.date) return stored;
  if (event.date < startOfToday()) return 'past';
  return stored;
};

const withRegInfo = (event, userId) => {
  const obj = event.toObject ? event.toObject() : { ...event };
  const registrationCount = obj.registrations?.length || 0;
  const isRegistered = userId
    ? (obj.registrations || []).some((r) => r.userId?.toString() === userId?.toString())
    : false;
  // Strip full registrations list from public response
  delete obj.registrations;
  obj.status = effectiveStatus(event);
  return { ...obj, registrationCount, isRegistered };
};

// ── List events ───────────────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { venueId, status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    const conds = [];
    if (venueId) filter.venueId = venueId;

    // Self-heal: any event whose date has passed is marked past in the DB.
    // Fire-and-forget — the query conditions below already self-correct.
    Event.updateMany(
      { date: { $lt: startOfToday() }, status: { $ne: 'past' } },
      { $set: { status: 'past' } }
    ).catch(() => {});

    if (status) {
      if (status === 'upcoming') {
        conds.push({
          $or: [
            { date: { $gte: startOfToday() } },
            { date: null },
            { date: { $exists: false } },
          ],
        });
        conds.push({ status: { $ne: 'past' } });
      } else if (status === 'past') {
        conds.push({
          $or: [{ date: { $lt: startOfToday() } }, { status: 'past' }],
        });
      } else {
        filter.status = status; // 'ongoing'
      }
    }

    if (search) {
      const re = new RegExp(search, 'i');
      const matchingVenues = await Venue.find({
        $or: [{ name: re }, { city: re }],
      }).select('_id');
      const vids = matchingVenues.map((v) => v._id);
      conds.push([
        { title: re },
        ...(vids.length ? [{ venueId: { $in: vids } }] : []),
      ]);
    }

    if (conds.length) {
      if (conds.length === 1 && Array.isArray(conds[0])) {
        filter.$or = conds[0];
      } else {
        const wrapped = conds.map((c) => (Array.isArray(c) ? { $or: c } : c));
        filter.$and = wrapped;
      }
    }

    const events = await Event.find(filter)
      .populate('venueId')
      .sort({ date: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Event.countDocuments(filter);

    // Resolve authenticated user once for registration info
    let userId = null;
    if (req.user) {
      const userDoc = await User.findOne({ firebaseUid: req.user.uid }).select('_id');
      userId = userDoc?._id;
    }

    res.json({ events: events.map((e) => withRegInfo(e, userId)), total, page, limit });
  } catch (error) {
    logger.error('Error fetching events:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ── Single event ──────────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('venueId');
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (event.status !== effectiveStatus(event)) {
      event.status = effectiveStatus(event);
      await event.save().catch(() => {});
    }

    let userId = null;
    if (req.user) {
      const userDoc = await User.findOne({ firebaseUid: req.user.uid }).select('_id');
      userId = userDoc?._id;
    }

    res.json(withRegInfo(event, userId));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// ── Register for an event ─────────────────────────────────────────────────────
router.post('/:id/register', authenticateToken, async (req, res) => {
  try {
    const userDoc = await User.findOne({ firebaseUid: req.user.uid });
    if (!userDoc) return res.status(404).json({ error: 'User not found' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.status === 'past') return res.status(400).json({ error: 'This event has already ended' });

    const alreadyIn = event.registrations.some(
      (r) => r.userId.toString() === userDoc._id.toString(),
    );
    if (alreadyIn) return res.status(409).json({ error: 'Already registered' });

    if (event.capacity && event.registrations.length >= event.capacity) {
      return res.status(400).json({ error: 'Event is fully booked' });
    }

    event.registrations.push({ userId: userDoc._id });
    await event.save();

    res.json({ registrationCount: event.registrations.length, isRegistered: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// ── Cancel registration ───────────────────────────────────────────────────────
router.delete('/:id/register', authenticateToken, async (req, res) => {
  try {
    const userDoc = await User.findOne({ firebaseUid: req.user.uid });
    if (!userDoc) return res.status(404).json({ error: 'User not found' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    event.registrations = event.registrations.filter(
      (r) => r.userId.toString() !== userDoc._id.toString(),
    );
    await event.save();

    res.json({ registrationCount: event.registrations.length, isRegistered: false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel registration' });
  }
});

// ── Admin CRUD ────────────────────────────────────────────────────────────────
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    logger.error('Error creating event:', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
