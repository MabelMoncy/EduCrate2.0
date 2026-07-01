import mongoose from 'mongoose';

const notificationSchema = mongoose.Schema(
  {
    studentFirebaseUid: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['approved', 'rejected'],
      required: true,
    },
    contentType: {
      type: String,
      enum: ['pyq', 'note'],
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    contentTitle: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
