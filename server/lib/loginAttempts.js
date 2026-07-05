import mongoose from 'mongoose';

/**
 * Tracks failed admin login attempts per IP address.
 *
 * After LOCKOUT_THRESHOLD consecutive failures, the IP is locked out for
 * LOCKOUT_DURATION_MINUTES. The counter resets on successful login.
 *
 * Uses a MongoDB TTL index so stale records auto-expire — no manual cleanup needed.
 */
const loginAttemptSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  lastAttempt: {
    type: Date,
    default: Date.now,
  },
  lockedUntil: {
    type: Date,
    default: null,
  },
});

// Auto-expire records 24 hours after last attempt — keeps the collection small
loginAttemptSchema.index({ lastAttempt: 1 }, { expireAfterSeconds: 86400 });

const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);

const LOCKOUT_THRESHOLD = 10;           // Lock after 10 consecutive failures
const LOCKOUT_DURATION_MINUTES = 30;    // Lock for 30 minutes

/**
 * Check if an IP is currently locked out.
 * @param {string} ip
 * @returns {Promise<{locked: boolean, remainingMinutes?: number}>}
 */
export const isLockedOut = async (ip) => {
  const record = await LoginAttempt.findOne({ ip });
  if (!record || !record.lockedUntil) return { locked: false };

  if (record.lockedUntil > new Date()) {
    const remaining = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return { locked: true, remainingMinutes: remaining };
  }

  // Lockout expired — reset
  await LoginAttempt.deleteOne({ ip });
  return { locked: false };
};

/**
 * Record a failed login attempt. Locks the IP after LOCKOUT_THRESHOLD failures.
 * @param {string} ip
 */
export const recordFailedAttempt = async (ip) => {
  const record = await LoginAttempt.findOneAndUpdate(
    { ip },
    {
      $inc: { attempts: 1 },
      $set: { lastAttempt: new Date() },
    },
    { upsert: true, new: true }
  );

  if (record.attempts >= LOCKOUT_THRESHOLD) {
    record.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    await record.save();
  }
};

/**
 * Clear failed attempts for an IP after successful login.
 * @param {string} ip
 */
export const clearFailedAttempts = async (ip) => {
  await LoginAttempt.deleteOne({ ip });
};
