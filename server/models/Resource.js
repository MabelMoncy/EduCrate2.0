import mongoose from 'mongoose';

const resourceSchema = mongoose.Schema(
  {
    title: {
      type:     String,
      required: true,
    },
    description: {
      type:    String,
      default: '',
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
    // Public HTTPS URL returned by Backblaze B2
    fileUrl: {
      type:     String,
      required: true,
    },
    // Backblaze B2 object keys
    storageKey: {
      type: String,
    },
    thumbnailKey: {
      type: String,
    },
    thumbnailUrl: {
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
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    }
  },
  {
    timestamps: true,
  }
);

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
