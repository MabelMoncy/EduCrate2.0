import mongoose from 'mongoose';

/**
 * Serverless-compatible MongoDB connection cache.
 * Caches both the connection instance and in-flight connection promise
 * in global scope across hot lambda invocations.
 */
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If connection dropped or closed, discard stale promise and cached connection to force reconnect
  if (cached.conn && mongoose.connection.readyState === 0) {
    cached.promise = null;
    cached.conn = null;
  }

  if (!process.env.MONGODB_URI) {
    const error = new Error('MONGODB_URI is not configured in environment variables.');
    console.error('[db] Connection failed:', error.message);
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
      process.exit(1);
    }
    throw error;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Fail fast rather than hang for 10s if disconnected
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((m) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[db] Connected ✓');
      }
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null; // Clear so subsequent requests can retry
    cached.conn = null;
    console.error('[db] Connection failed:', error.message);
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
      process.exit(1);
    }
    throw error;
  }
};

export default connectDB;
