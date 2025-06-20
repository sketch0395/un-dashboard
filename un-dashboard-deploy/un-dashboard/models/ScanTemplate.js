const mongoose = require('mongoose');

const ScanTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scanParameters: {
    ipRange: {
      type: String,
      required: true
    },
    ports: [String],
    scanType: {
      type: String,
      enum: ['ping', 'os', 'full', 'custom'],
      default: 'ping'
    },
    osDetection: {
      type: Boolean,
      default: false
    },
    serviceDetection: {
      type: Boolean,
      default: false
    },
    timeout: {
      type: Number,
      default: 5000
    },
    customOptions: mongoose.Schema.Types.Mixed
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['infrastructure', 'security', 'monitoring', 'compliance', 'research', 'other'],
    default: 'other'
  },
  tags: [String],
  usage: {
    useCount: {
      type: Number,
      default: 0
    },
    lastUsed: Date
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ScanTemplateSchema.index({ createdBy: 1 });
ScanTemplateSchema.index({ isPublic: 1 });
ScanTemplateSchema.index({ category: 1 });
ScanTemplateSchema.index({ tags: 1 });
ScanTemplateSchema.index({ 'usage.useCount': -1 });
ScanTemplateSchema.index({ 'rating.average': -1 });

module.exports = mongoose.models.ScanTemplate || mongoose.model('ScanTemplate', ScanTemplateSchema);
