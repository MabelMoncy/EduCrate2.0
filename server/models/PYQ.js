import mongoose from 'mongoose';

const pyqSchema = mongoose.Schema(
  {
    semester: {
      type: String,
      required: true,
      enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'],
    },
    subject: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    cloudinaryPublicId: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileSize: {
      type: String,
    },
    uploadedBy: {
      type: String, // Firebase UID or 'admin'
      required: true,
    },
    uploadedByRole: {
      type: String,
      enum: ['admin', 'student'],
      default: 'admin',
    },
    status: {
      type: String,
      enum: ['pending', 'published', 'rejected'],
      default: 'published',
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

const PYQ = mongoose.model('PYQ', pyqSchema);

export default PYQ;
