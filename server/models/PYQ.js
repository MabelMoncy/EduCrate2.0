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
    price: {
      type: Number,
      required: true,
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

const PYQ = mongoose.model('PYQ', pyqSchema);

export default PYQ;
