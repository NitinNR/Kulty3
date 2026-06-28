import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables FIRST - before anything else
const envPath = path.resolve(__dirname, '../.env');
console.log('📁 Loading .env from:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error.message);
} else {
  console.log('✓ .env file loaded successfully');
  console.log('  - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✓' : '✗');
  console.log('  - FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✓' : '✗');
  console.log('  - FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✓' : '✗');
  console.log('  - MONGODB_URI:', process.env.MONGODB_URI ? '✓' : '✗');
  console.log('  - RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? '✓' : '✗');
}

// Now dynamically import everything else
const main = async () => {
  const express = (await import('express')).default;
  const cors = (await import('cors')).default;
  const { connectDB } = await import('./config/db.js');
  const authRoutes = (await import('./routes/auth.js')).default;
  const usersRoutes = (await import('./routes/users.js')).default;
  const venuesRoutes = (await import('./routes/venues.js')).default;
  const eventsRoutes = (await import('./routes/events.js')).default;
  const entriesRoutes = (await import('./routes/entries.js')).default;
  const paymentsRoutes = (await import('./routes/payments.js')).default;
  const adminRoutes = (await import('./routes/admin.js')).default;
  const applicationsRoutes = (await import('./routes/applications.js')).default;

  const app = express();
  const PORT = process.env.PORT || 5000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Connect to database
  connectDB().catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/venues', venuesRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/entries', entriesRoutes);
  app.use('/api/payments', paymentsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/applications', applicationsRoutes);

  app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
  });

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log('📚 API available at http://localhost:' + PORT + '/api\n');
  });
};

// Run the main function
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
