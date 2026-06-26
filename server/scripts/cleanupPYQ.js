import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Resource from '../models/Resource.js';
import cloudinary from '../config/cloudinary.js';

dotenv.config();

const cleanOldPYQs = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    const pyqs = await Resource.find({ type: 'pyq' });
    console.log(`Found ${pyqs.length} old PYQ resources to delete.`);

    let deletedCount = 0;
    for (const pyq of pyqs) {
      if (pyq.cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(pyq.cloudinaryPublicId, { resource_type: 'raw' });
          console.log(`Deleted from Cloudinary: ${pyq.cloudinaryPublicId}`);
        } catch (err) {
          console.error(`Failed to delete from Cloudinary: ${pyq.cloudinaryPublicId}`, err);
        }
      }
      await Resource.findByIdAndDelete(pyq._id);
      deletedCount++;
    }

    console.log(`Successfully deleted ${deletedCount} old PYQ records.`);
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
};

cleanOldPYQs();
