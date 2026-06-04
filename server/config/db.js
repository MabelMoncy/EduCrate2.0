import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    // L28 — never log the Atlas cluster hostname (contains account-identifiable info)
    // It is visible in logs aggregators / CI output, even in dev sessions
    console.log('Database connected successfully');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
