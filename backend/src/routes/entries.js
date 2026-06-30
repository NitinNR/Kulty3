import express from 'express';
import Entry from '../models/Entry.js';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

router.post('/scan', authenticateToken, async (req, res) => {
  try {
    const { qrCodeData, venueId } = req.body;

    if (!qrCodeData || !venueId) {
      return res.status(400).json({ error: 'qrCodeData and venueId are required' });
    }

    // Resolve the scanner's user doc
    const scannerUser = await User.findOne({ firebaseUid: req.user.uid });
    if (!scannerUser) return res.status(401).json({ error: 'Scanner account not found' });

    // Only venue owners and venue staff may scan
    if (!['venue_owner', 'venue_staff'].includes(scannerUser.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify scanner has access to this specific venue (owner OR listed as staff)
    const scannerEmail = scannerUser.email?.toLowerCase();
    const venue = await Venue.findOne({
      _id: venueId,
      $or: [
        { ownerId: scannerUser._id },
        { staff: scannerEmail },
      ],
    });
    if (!venue) return res.status(403).json({ error: 'Venue not found or not authorized' });

    // Look up member by their unique QR code data
    const member = await User.findOne({ qrCodeData });
    if (!member) return res.status(404).json({ error: 'Member not found. QR code may be invalid.' });

    // Only allow active members
    if (member.subscription?.status !== 'active') {
      return res.status(403).json({ error: 'Membership is inactive or expired' });
    }

    // Prevent duplicate entries: one entry per member per venue per calendar day (UTC)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existing = await Entry.findOne({
      userId: member._id,
      venueId,
      scannedAt: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existing) {
      return res.status(200).json({
        entry: existing,
        memberName: member.name,
        memberPhoto: member.profilePhoto,
        membershipId: member.membershipId,
        alreadyCheckedIn: true,
        message: `${member.name} already checked in at this venue today`,
      });
    }

    const entry = new Entry({
      userId: member._id,
      venueId,
      scannedBy: scannerUser._id,
      scannedAt: new Date(),
    });

    await entry.save();

    res.status(201).json({
      entry,
      memberName: member.name,
      memberPhoto: member.profilePhoto,
      membershipId: member.membershipId,
      alreadyCheckedIn: false,
    });
  } catch (error) {
    console.error('Error scanning entry:', error);
    res.status(500).json({ error: 'Failed to scan entry' });
  }
});

router.get('/my', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    const { page = 1, limit = 15 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
      Entry.find({ userId: user._id })
        .populate('venueId')
        .sort({ scannedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Entry.countDocuments({ userId: user._id }),
    ]);

    res.json({ entries, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Error fetching user entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

router.get('/venue/:venueId', authenticateToken, requireRole(['venue_owner', 'venue_staff']), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
      Entry.find({ venueId: req.params.venueId })
        .populate('userId', 'name profilePhoto membershipId')
        .sort({ scannedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Entry.countDocuments({ venueId: req.params.venueId }),
    ]);

    res.json({ entries, total, page: parseInt(page), limit: parseInt(limit) });
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

router.patch('/:entryId/bills/:billId', authenticateToken, requireRole(['venue_owner', 'venue_staff']), async (req, res) => {
  try {
    const { entryId, billId } = req.params;
    const { status, note } = req.body;

    const entry = await Entry.findById(entryId);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    const bill = entry.bills.id(billId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const wasAlreadyApproved = bill.status === 'approved';

    bill.status = status;
    bill.verifiedBy = req.userDoc._id;
    bill.verifiedAt = new Date();
    if (note) bill.note = note;

    // Calculate and accumulate cashback when a bill is approved for the first time
    if (status === 'approved' && !wasAlreadyApproved) {
      const venue = await Venue.findById(entry.venueId);
      const pct = venue?.cashbackPercentage || 0;
      if (pct > 0) {
        const earned = Math.round((bill.amount * pct) / 100);
        entry.cashback = {
          amount: (entry.cashback?.amount || 0) + earned,
          status: 'pending',
        };
      }
    }

    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error('Error updating bill:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

export default router;
