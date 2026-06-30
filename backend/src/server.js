import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env for local dev; on Vercel env vars come from the dashboard
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import authRoutes         from './routes/auth.js';
import usersRoutes        from './routes/users.js';
import venuesRoutes       from './routes/venues.js';
import eventsRoutes       from './routes/events.js';
import entriesRoutes      from './routes/entries.js';
import paymentsRoutes     from './routes/payments.js';
import adminRoutes        from './routes/admin.js';
import applicationsRoutes from './routes/applications.js';

const app = express();

// Allow the deployed frontend origin + localhost in dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL, // set this to your Vercel frontend URL in production
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
}));

// Capture raw body for Razorpay webhook signature verification
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));

// Ensure DB is connected before any route runs (serverless-safe; cached on warm invocations)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection failed:', err);
    res.status(503).json({ error: 'Service temporarily unavailable' });
  }
});

app.use('/api/auth',         authRoutes);
app.use('/api/users',        usersRoutes);
app.use('/api/venues',       venuesRoutes);
app.use('/api/events',       eventsRoutes);
app.use('/api/entries',      entriesRoutes);
app.use('/api/payments',     paymentsRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/applications', applicationsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'OK' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Local development only — Vercel invokes the exported app directly
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 API at http://localhost:${PORT}/api\n`);
  });
}

export default app;
