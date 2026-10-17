import express from 'express';
import Settings from '../models/Settings.js';
import { authenticateToken } from '../middleware/firebaseAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import logger from '../config/logger.js';

const router = express.Router();

// Auth methods fall back to "both enabled" when the settings document (or a
// field on it) is missing, so a fresh database or a DB hiccup never locks users
// out of signing in.
const DEFAULT_AUTH_METHODS = { google: true, phone: true };

const readAuthMethods = (settings) => {
  const auth = settings?.authMethods || {};
  return {
    google: auth.google !== false,
    phone: auth.phone !== false,
  };
};

const loadSettings = async () => {
  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) settings = await Settings.create({ key: 'global' });
  return settings;
};

// Public — the login screen reads this to decide which methods to show.
router.get('/', async (req, res) => {
  try {
    const settings = await loadSettings();
    res.json({ authMethods: readAuthMethods(settings) });
  } catch (err) {
    logger.error('Failed to fetch settings:', { error: err.message, stack: err.stack });
    res.json({ authMethods: DEFAULT_AUTH_METHODS });
  }
});

// Admin — toggle which sign-in methods are available (at least one must stay on).
router.put('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { authMethods } = req.body || {};
    if (!authMethods || typeof authMethods !== 'object') {
      return res.status(400).json({ error: 'authMethods is required' });
    }

    const next = {
      google: Boolean(authMethods.google),
      phone: Boolean(authMethods.phone),
    };

    if (!next.google && !next.phone) {
      return res.status(400).json({ error: 'At least one sign-in method must stay enabled' });
    }

    const settings = await loadSettings();
    settings.authMethods = next;
    await settings.save();

    res.json({ authMethods: next });
  } catch (err) {
    logger.error('Failed to update settings:', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
