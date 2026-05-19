import mongoose from 'mongoose';

const userSchema = mongoose.Schema(
  {
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
    },
    password: {
      type:     String,
      required: true,
    },
    role: {
      type:    String,
      enum:    ['admin'],
      default: 'admin',
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
