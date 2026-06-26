import mongoose from 'mongoose';

const studentSchema = mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    photoURL: {
      type: String,
      default: '',
    },
    purchasedPYQs: [
      {
        pyqId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'PYQ',
          required: true,
        },
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Order',
          required: true,
        },
        paidAt: {
          type: Date,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Student = mongoose.model('Student', studentSchema);

export default Student;
