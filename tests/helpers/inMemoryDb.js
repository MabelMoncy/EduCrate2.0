import mongoose from 'mongoose';

/**
 * Manages test database connection lifecycles.
 */
export const connectTestDb = async (uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/educrate_test') => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
      bufferCommands: false, // Prevent 10-second hanging buffer timeouts
    });
    return mongoose.connection;
  } catch (err) {
    // If local Mongo daemon is offline, return null safely without calling process.exit()
    return null;
  }
};

export const disconnectTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export const clearCollections = async () => {
  if (mongoose.connection.readyState === 1) {
    const dbName = mongoose.connection.name || '';
    if (!/test/i.test(dbName)) {
      throw new Error(`Refusing to clear non-test database "${dbName}"`);
    }
    const collections = mongoose.connection.collections;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
};

