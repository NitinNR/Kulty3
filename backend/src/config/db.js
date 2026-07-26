import mongoose from 'mongoose';
import logger from './logger.js';

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
        logger.info(`MongoDB connected: ${m.connection.host}`);
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // allow retry on next request
    logger.error('MongoDB connection error:', { error: err.message, stack: err.stack });
    throw err;
  }

  return cached.conn;
};
