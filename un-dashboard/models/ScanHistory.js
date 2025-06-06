const mongoose = require('mongoose');

const ScanHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  scanId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    maxlength: 100,
    trim: true
  },
  ipRange: {
    type: String,
    required: true,
    index: true
  },
  deviceCount: {
    type: Number,
    required: true,
    min: 0
  },
  scanData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  metadata: {
    scanType: {
      type: String,
      enum: ['ping', 'os', 'full', 'custom'],
      default: 'ping'
    },
    scanDuration: Number, // in milliseconds
    osDetection: Boolean,
    serviceDetection: Boolean,
    ports: [String],
    hasNetworkTopology: Boolean,
    vendor: String,
    deviceTypes: [String] // extracted device types from scan
  },
  settings: {
    isPrivate: {
      type: Boolean,
      default: true
    },
    isFavorite: {
      type: Boolean,
      default: false
    },
    tags: [String],
    notes: {
      type: String,
      maxlength: 1000
    }
  },
  sync: {
    lastSyncedAt: {
      type: Date,
      default: Date.now
    },
    syncedFrom: {
      type: String,
      enum: ['local', 'database', 'import'],
      default: 'database'
    },
    version: {
      type: Number,
      default: 1
    }
  }
}, {
  timestamps: true,
  collection: 'scan_history'
});

// Compound indexes for efficient queries
ScanHistorySchema.index({ userId: 1, createdAt: -1 });
ScanHistorySchema.index({ userId: 1, ipRange: 1, createdAt: -1 });
ScanHistorySchema.index({ userId: 1, 'settings.isFavorite': 1, createdAt: -1 });
ScanHistorySchema.index({ userId: 1, 'settings.tags': 1 });
ScanHistorySchema.index({ 'metadata.scanType': 1, createdAt: -1 });

// TTL index for automatic cleanup of old scans (optional - 1 year retention)
ScanHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static methods for common operations
ScanHistorySchema.statics.findByUser = function(userId, limit = 50, offset = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .populate('userId', 'username email');
};

ScanHistorySchema.statics.findByUserAndIpRange = function(userId, ipRange, limit = 10) {
  return this.find({ userId, ipRange })
    .sort({ createdAt: -1 })
    .limit(limit);
};

ScanHistorySchema.statics.findFavoritesByUser = function(userId, limit = 20) {
  return this.find({ userId, 'settings.isFavorite': true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

ScanHistorySchema.statics.findByTags = function(userId, tags, limit = 30) {
  return this.find({ 
    userId, 
    'settings.tags': { $in: tags }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

ScanHistorySchema.statics.getStatsByUser = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalScans: { $sum: 1 },
        totalDevices: { $sum: '$deviceCount' },
        favoriteCount: {
          $sum: { $cond: ['$settings.isFavorite', 1, 0] }
        },
        scanTypes: { $addToSet: '$metadata.scanType' },
        lastScanDate: { $max: '$createdAt' },
        firstScanDate: { $min: '$createdAt' }
      }
    }
  ]);
};

// Instance methods
ScanHistorySchema.methods.toggleFavorite = function() {
  this.settings.isFavorite = !this.settings.isFavorite;
  this.sync.lastSyncedAt = new Date();
  this.sync.version += 1;
  return this.save();
};

ScanHistorySchema.methods.addTag = function(tag) {
  if (!this.settings.tags.includes(tag)) {
    this.settings.tags.push(tag);
    this.sync.lastSyncedAt = new Date();
    this.sync.version += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

ScanHistorySchema.methods.removeTag = function(tag) {
  this.settings.tags = this.settings.tags.filter(t => t !== tag);
  this.sync.lastSyncedAt = new Date();
  this.sync.version += 1;
  return this.save();
};

ScanHistorySchema.methods.updateNotes = function(notes) {
  this.settings.notes = notes;
  this.sync.lastSyncedAt = new Date();
  this.sync.version += 1;
  return this.save();
};

// Pre-save middleware to update sync information
ScanHistorySchema.pre('save', function(next) {
  if (this.isModified() && !this.isModified('sync.lastSyncedAt')) {
    this.sync.lastSyncedAt = new Date();
    this.sync.version += 1;
  }
  next();
});

// Create or reuse the ScanHistory model
let ScanHistory;
try {
  ScanHistory = mongoose.model('ScanHistory');
} catch {
  ScanHistory = mongoose.model('ScanHistory', ScanHistorySchema);
}

module.exports = ScanHistory;
