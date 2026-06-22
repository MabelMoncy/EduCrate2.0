import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    if (process.env.NODE_ENV === 'development') {
      console.log('[db] Connected successfully');
    }
  } catch (error) {
    console.error('[db] Connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;
