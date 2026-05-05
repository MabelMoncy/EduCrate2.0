import mongoose from 'mongoose';

const resourceSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    semester: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
      enum: ['pdf'], // strict to PDF based on requirements
    },
    fileSize: {
      type: String,
    },
    uploadedBy: {
      type: String, // Storing Supabase User ID or Email
      required: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
