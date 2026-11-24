import mongoose from 'mongoose';

const revokedTokenSchema = new mongoose.Schema(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours matching JWT expiry
    },
    revokedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'revokedtokens', timestamps: true }
);

// TTL index: MongoDB automatically removes expired revoked tokens
revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RevokedToken = mongoose.model('RevokedToken', revokedTokenSchema);
export default RevokedToken;

