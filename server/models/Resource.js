import mongoose from 'mongoose';

const resourceSchema = mongoose.Schema(
  {
    title: {
      type:     String,
      required: true,
    },
    description: {
      type:     String,
      required: true,
    },
    semester: {
      type:     String,
      required: true,
    },
    subject: {
      type:     String,
      required: true,
    },
    type: {
      type:    String,
      enum:    ['notes', 'pyq'],
      default: 'notes',
    },
    // Public HTTPS URL returned by Cloudinary (secure_url)
    fileUrl: {
      type:     String,
      required: true,
    },
    // Cloudinary public_id — stored to enable clean asset deletion
    cloudinaryPublicId: {
      type: String,
    },
    fileType: {
      type:     String,
      required: true,
      enum:     ['pdf'],
    },
    fileSize: {
      type: String,
    },
    // 'anonymous' for public uploads; extend later if auth is added
    uploadedBy: {
      type:     String,
      required: true,
    },
    isPinned: {
      type:    Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
