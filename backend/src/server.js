import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load .env for local dev; on Vercel env vars come from the dashboard
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Ensure logs directory exists (not on Vercel — filesystem is read-only there)
const logsDir = path.resolve(__dirname, '../logs');
if (!process.env.VERCEL && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import logger from './config/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import authRoutes         from './routes/auth.js';
import usersRoutes        from './routes/users.js';
import venuesRoutes       from './routes/venues.js';
import eventsRoutes       from './routes/events.js';
import entriesRoutes      from './routes/entries.js';
import paymentsRoutes     from './routes/payments.js';
import adminRoutes        from './routes/admin.js';
import adminPaymentsRoutes from './routes/adminPayments.js';
import applicationsRoutes from './routes/applications.js';
import citiesRoutes       from './routes/cities.js';
import settingsRoutes     from './routes/settings.js';

const app = express();

// Allow the deployed frontend origin + localhost in dev
const allowedOrigins = [
  'https://kulty.in',
  'https://www.kulty.in',
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.FRONTEND_URL && process.env.FRONTEND_URL,
  ...process.env.FRONTEND_URLS?.split(',').map(url => url.trim()).filter(Boolean)
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed. Allowed: ${allowedOrigins.join(', ')}`));
  },
  credentials: true,
}));

// Access logging — runs before body parsing to capture every request
app.use(requestLogger);

// ── Razorpay webhook raw-body capture ─────────────────────────────────────────
// The webhook HMAC is computed over the exact bytes Razorpay signed. The
// `verify` hook below only fires when Content-Type is application/json, so a
// dedicated raw parser is mounted on this path to guarantee `req.rawBody` is
// always a Buffer. The buffer is parsed here so `req.body` stays an object for
// the route handler.
const WEBHOOK_PATH = '/api/payments/webhook';
app.use(
  WEBHOOK_PATH,
  express.raw({ type: '*/*', limit: '2mb' }),
  (req, _res, next) => {
    req.rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    try {
      req.body = req.rawBody.length ? JSON.parse(req.rawBody.toString('utf8')) : {};
    } catch {
      // Leave body empty; the signature check will reject it downstream.
      req.body = {};
    }
    next();
  }
);

// JSON body parser for every other route. No route in this API accepts file
// uploads or base64 payloads (all media is referenced by URL), so the limit
// drops from 10mb to 2mb to bound memory use per invocation.
const jsonParser = express.json({ limit: '2mb' });
app.use((req, res, next) => {
  // Stream already consumed by the raw parser mounted above.
  if (req.path === WEBHOOK_PATH) return next();
  jsonParser(req, res, next);
});

// Ensure DB is connected before any route runs (serverless-safe; cached on warm invocations)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    logger.error('DB connection failed', { error: err.message, stack: err.stack });
    res.status(503).json({ error: 'Service temporarily unavailable' });
  }
});

app.use('/api/auth',         authRoutes);
app.use('/api/users',        usersRoutes);
app.use('/api/venues',       venuesRoutes);
app.use('/api/events',       eventsRoutes);
app.use('/api/entries',      entriesRoutes);
app.use('/api/payments',     paymentsRoutes);
app.use('/api/admin/payments', adminPaymentsRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/cities',       citiesRoutes);
app.use('/api/settings',     settingsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'OK' }));

app.use((err, _req, res, _next) => {
  const isCors = err.message?.startsWith('CORS:');
  const status = isCors ? 403 : 500;
  logger.error(`${err.message || 'Unhandled error'}`, {
    status,
    stack: err.stack,
    isCors,
  });
  res.status(status).json({ error: isCors ? err.message : 'Internal server error' });
});

// Local development only — Vercel invokes the exported app directly
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info(`API at http://localhost:${PORT}/api`);
  });
}

export default app;
