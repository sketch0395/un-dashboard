const mongoose = require('mongoose');

const ScanCollaborationSchema = new mongoose.Schema({
  sharedScanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedScan',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['view', 'download', 'comment', 'rate', 'modify', 'share'],
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed // Action-specific data (comment text, rating value, etc.)
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Indexes for better query performance
ScanCollaborationSchema.index({ sharedScanId: 1, createdAt: -1 });
ScanCollaborationSchema.index({ userId: 1, createdAt: -1 });
ScanCollaborationSchema.index({ action: 1 });

module.exports = mongoose.models.ScanCollaboration || mongoose.model('ScanCollaboration', ScanCollaborationSchema);
