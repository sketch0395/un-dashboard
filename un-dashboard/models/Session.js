const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  loginAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    browser: String,
    os: String,
    device: String,
    location: {
      country: String,
      city: String,
      timezone: String
    }
  }
}, {
  timestamps: true,
  collection: 'sessions'
});

// Indexes
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 });
sessionSchema.index({ lastActivity: 1 });

// Method to extend session
sessionSchema.methods.extend = function(duration = 24 * 60 * 60 * 1000) { // Default 24 hours
  this.expiresAt = new Date(Date.now() + duration);
  this.lastActivity = new Date();
  return this.save();
};

// Method to deactivate session
sessionSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false }
    ]
  });
};

// Static method to deactivate all user sessions
sessionSchema.statics.deactivateUserSessions = function(userId) {
  return this.updateMany(
    { userId: userId, isActive: true },
    { $set: { isActive: false } }
  );
};

// Static method to get active sessions for user
sessionSchema.statics.getActiveSessions = function(userId) {
  return this.find({
    userId: userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivity: -1 });
};

// Create or reuse the Session model
let Session;
try {
  Session = mongoose.model('Session');
} catch {
  Session = mongoose.model('Session', sessionSchema);
}

module.exports = Session;
