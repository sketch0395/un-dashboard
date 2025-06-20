const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'LOGOUT', 
      'FAILED_LOGIN',
      'PASSWORD_CHANGE',
      'USER_REGISTRATION',
      'USER_APPROVAL',
      'USER_REJECTION',
      'USER_UPDATE',
      'USER_DELETION',
      'SESSION_CLEANUP',
      'ADMIN_ACTION',
      'SYSTEM_ERROR',
      'SECURITY_ALERT',
      'DATA_EXPORT',
      'DATA_IMPORT',
      'CONFIG_CHANGE',
      'PERMISSION_CHANGE',
      'SYSTEM',
      'USER',
      'ADMIN'
    ]
  },
  action: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: null
  },
  resource: {
    type: String,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sessionId: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Indexes for better performance
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ sessionId: 1 });

// TTL index to auto-delete old logs (optional - 1 year retention)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static methods for common queries
auditLogSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'username email');
};

auditLogSchema.statics.findByEventType = function(eventType, limit = 100) {
  return this.find({ eventType })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'username email');
};

auditLogSchema.statics.findByDateRange = function(startDate, endDate, limit = 500) {
  return this.find({
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'username email');
};

auditLogSchema.statics.getSecurityAlerts = function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    timestamp: { $gte: since },
    $or: [
      { eventType: 'FAILED_LOGIN' },
      { eventType: 'SECURITY_ALERT' },
      { success: false }
    ]
  })
    .sort({ timestamp: -1 })
    .populate('userId', 'username email');
};

// Create or reuse the AuditLog model
let AuditLog;
try {
  AuditLog = mongoose.model('AuditLog');
} catch {
  AuditLog = mongoose.model('AuditLog', auditLogSchema);
}

module.exports = AuditLog;