const mongoose = require('mongoose');

const SharedScanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  originalScanId: {
    type: String,
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scanData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  metadata: {
    ipRange: String,
    deviceCount: Number,
    scanDate: Date,
    scanType: {
      type: String,
      enum: ['ping', 'os', 'full', 'custom']
    },
    hasNetworkTopology: Boolean,
    ports: [String],
    osDetection: Boolean,
    serviceDetection: Boolean
  },
  sharing: {
    visibility: {
      type: String,
      enum: ['public', 'private', 'restricted'],
      default: 'private'
    },
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    allowedRoles: [{
      type: String,
      enum: ['admin', 'user', 'viewer']
    }]
  },
  collaboration: {
    allowComments: {
      type: Boolean,
      default: true
    },
    allowRating: {
      type: Boolean,
      default: true
    },
    allowModification: {
      type: Boolean,
      default: false
    }
  },
  stats: {
    viewCount: {
      type: Number,
      default: 0
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0
    },
    ratingCount: {
      type: Number,
      default: 0
    }
  },
  tags: [String],
  category: {
    type: String,
    enum: ['infrastructure', 'security', 'monitoring', 'compliance', 'research', 'other'],
    default: 'other'
  },
  isTemplate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance
SharedScanSchema.index({ ownerId: 1 });
SharedScanSchema.index({ 'sharing.visibility': 1 });
SharedScanSchema.index({ category: 1 });
SharedScanSchema.index({ tags: 1 });
SharedScanSchema.index({ createdAt: -1 });
SharedScanSchema.index({ 'stats.rating': -1 });

module.exports = mongoose.models.SharedScan || mongoose.model('SharedScan', SharedScanSchema);
