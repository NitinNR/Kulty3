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

router.get('/venue/:venueId', authenticateToken, requireRole(['venue_owner', 'venue_staff']), async (req, res) => {
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
