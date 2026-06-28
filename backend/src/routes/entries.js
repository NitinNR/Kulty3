import express from 'express';
import Entry from '../models/Entry.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

router.post('/scan', authenticateToken, requireRole(['venue_owner']), async (req, res) => {
  try {
    const { qrCodeData, venueId } = req.body;

    const user = await User.findOne({ qrCodeData });
    if (!user) return res.status(404).json({ error: 'Member not found' });

    const entry = new Entry({
      userId: user._id,
      venueId,
      scannedBy: req.userDoc._id,
      scannedAt: new Date(),
    });

    await entry.save();

    res.status(201).json({
      entry,
      memberName: user.name,
      memberPhoto: user.profilePhoto,
    });
  } catch (error) {
    console.error('Error scanning entry:', error);
    res.status(500).json({ error: 'Failed to scan entry' });
  }
});

router.get('/my', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    const entries = await Entry.find({ userId: user._id })
      .populate('venueId')
      .sort({ scannedAt: -1 });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching user entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

router.get('/venue/:venueId', authenticateToken, requireRole(['venue_owner']), async (req, res) => {
  try {
    const entries = await Entry.find({ venueId: req.params.venueId })
      .populate('userId', 'name profilePhoto membershipId')
      .sort({ scannedAt: -1 });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching venue entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

router.post('/:entryId/bills', authenticateToken, async (req, res) => {
  try {
    const { entryId } = req.params;
    const { imageUrl, amount } = req.body;

    const entry = await Entry.findById(entryId);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (entry.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    entry.bills.push({
      imageUrl,
      amount,
      status: 'pending',
      uploadedAt: new Date(),
    });

    await entry.save();
    res.status(201).json(entry);
  } catch (error) {
    console.error('Error uploading bill:', error);
    res.status(500).json({ error: 'Failed to upload bill' });
  }
});

router.patch('/:entryId/bills/:billId', authenticateToken, requireRole(['venue_owner']), async (req, res) => {
  try {
    const { entryId, billId } = req.params;
    const { status, note } = req.body;

    const entry = await Entry.findById(entryId);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    const bill = entry.bills.id(billId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    bill.status = status;
    bill.verifiedBy = req.userDoc._id;
    bill.verifiedAt = new Date();
    if (note) bill.note = note;

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

export default router;
