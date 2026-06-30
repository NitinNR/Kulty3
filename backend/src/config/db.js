import mongoose from 'mongoose';

// Cached connection — reused across serverless warm invocations
let cached = global._mongooseConn;
if (!cached) cached = global._mongooseConn = { conn: null, promise: null };

export const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    // bufferCommands defaults to true — Mongoose queues ops while connecting
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI)
      .then((m) => {
        console.log(`MongoDB connected: ${m.connection.host}`);
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // allow retry on next request
    console.error('MongoDB connection error:', err);
    throw err;
  }

  return cached.conn;
};
