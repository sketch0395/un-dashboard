// Performance optimization utilities for database queries
import dbConnection from '../../../lib/db';

class PerformanceOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.maxCacheSize = 100;
  }

  // Cache results for frequently accessed data
  async getCachedQuery(key, queryFn, expiry = this.cacheExpiry) {
    const cached = this.queryCache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const result = await queryFn();
    
    // Implement LRU cache by removing oldest entries
    if (this.queryCache.size >= this.maxCacheSize) {
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }

    this.queryCache.set(key, {
      data: result,
      expiry: Date.now() + expiry
    });

    return result;
  }

  // Clear cache for specific patterns
  clearCache(pattern) {
    if (!pattern) {
      this.queryCache.clear();
      return;
    }

    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }

  // Session query optimizations
  async getSessionStats(filters = {}) {
    const cacheKey = `session_stats_${JSON.stringify(filters)}`;
    
    return this.getCachedQuery(cacheKey, async () => {
      await dbConnection.connectMongoDB();
      const { Session } = require('../../../models/Session');
      
      const pipeline = [
        // Add match stage if filters provided
        ...(Object.keys(filters).length > 0 ? [{ $match: filters }] : []),
        
        // Group by status and count
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgDuration: { $avg: { $subtract: ['$lastActivity', '$createdAt'] } }
          }
        },
        
        // Add total count
        {
          $group: {
            _id: null,
            statuses: { $push: { status: '$_id', count: '$count', avgDuration: '$avgDuration' } },
            total: { $sum: '$count' }
          }
        }
      ];

      const result = await Session.aggregate(pipeline);
      return result[0] || { statuses: [], total: 0 };
    });
  }

  // Optimized session cleanup with batch processing
  async cleanupSessionsBatch(criteria = {}, batchSize = 1000) {
    await dbConnection.connectMongoDB();
    const { Session } = require('../../../models/Session');

    const query = {
      $or: [
        { lastActivity: { $lt: new Date(Date.now() - (24 * 60 * 60 * 1000)) } }, // 24 hours
        { status: 'expired' },
        ...Object.entries(criteria).map(([key, value]) => ({ [key]: value }))
      ]
    };

    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const sessionsToDelete = await Session.find(query)
        .limit(batchSize)
        .select('_id')
        .lean();

      if (sessionsToDelete.length === 0) {
        hasMore = false;
        break;
      }

      const ids = sessionsToDelete.map(s => s._id);
      const deleteResult = await Session.deleteMany({ _id: { $in: ids } });
      totalDeleted += deleteResult.deletedCount;

      // Break if we deleted fewer than the batch size
      if (sessionsToDelete.length < batchSize) {
        hasMore = false;
      }

      // Add small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear related cache
    this.clearCache('session');

    return { deleted: totalDeleted };
  }

  // Audit log query optimizations
  async getAuditLogStats(timeRange = '24h', eventTypes = []) {
    const cacheKey = `audit_stats_${timeRange}_${eventTypes.join('_')}`;
    
    return this.getCachedQuery(cacheKey, async () => {
      await dbConnection.connectMongoDB();
      const { AuditLog } = require('../../../models/AuditLog');

      const timeRangeMs = this.parseTimeRange(timeRange);
      const startTime = new Date(Date.now() - timeRangeMs);

      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startTime },
            ...(eventTypes.length > 0 && { eventType: { $in: eventTypes } })
          }
        },
        {
          $group: {
            _id: {
              eventType: '$eventType',
              hour: { $dateToString: { format: '%Y-%m-%d-%H', date: '$timestamp' } }
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.eventType',
            totalCount: { $sum: '$count' },
            hourlyData: { 
              $push: { 
                hour: '$_id.hour', 
                count: '$count' 
              } 
            }
          }
        },
        {
          $sort: { totalCount: -1 }
        }
      ];

      return await AuditLog.aggregate(pipeline);
    }, 2 * 60 * 1000); // Cache for 2 minutes
  }

  // Archive old audit logs to improve query performance
  async archiveOldAuditLogs(olderThanDays = 90, batchSize = 5000) {
    await dbConnection.connectMongoDB();
    const { AuditLog } = require('../../../models/AuditLog');

    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    let totalArchived = 0;
    let hasMore = true;

    while (hasMore) {
      const logsToArchive = await AuditLog.find({
        timestamp: { $lt: cutoffDate }
      })
        .limit(batchSize)
        .select('_id')
        .lean();

      if (logsToArchive.length === 0) {
        hasMore = false;
        break;
      }

      // In a production environment, you might want to:
      // 1. Export to cold storage (S3, etc.)
      // 2. Compress the data
      // 3. Move to archive collection
      
      // For now, we'll just delete very old logs
      const ids = logsToArchive.map(l => l._id);
      const deleteResult = await AuditLog.deleteMany({ _id: { $in: ids } });
      totalArchived += deleteResult.deletedCount;

      if (logsToArchive.length < batchSize) {
        hasMore = false;
      }

      // Add delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Clear related cache
    this.clearCache('audit');

    return { archived: totalArchived };
  }

  // Database index recommendations
  async createOptimalIndexes() {
    await dbConnection.connectMongoDB();
    const { Session } = require('../../../models/Session');
    const { AuditLog } = require('../../../models/AuditLog');

    try {
      // Session collection indexes
      await Session.collection.createIndex({ lastActivity: 1 });
      await Session.collection.createIndex({ status: 1 });
      await Session.collection.createIndex({ userId: 1, lastActivity: -1 });
      await Session.collection.createIndex({ createdAt: 1 });

      // AuditLog collection indexes
      await AuditLog.collection.createIndex({ timestamp: -1 });
      await AuditLog.collection.createIndex({ eventType: 1, timestamp: -1 });
      await AuditLog.collection.createIndex({ userId: 1, timestamp: -1 });
      await AuditLog.collection.createIndex({ ipAddress: 1, timestamp: -1 });

      return { success: true, message: 'Indexes created successfully' };
    } catch (error) {
      console.error('Error creating indexes:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper method to parse time ranges
  parseTimeRange(timeRange) {
    const multipliers = {
      'm': 60 * 1000,           // minutes
      'h': 60 * 60 * 1000,     // hours
      'd': 24 * 60 * 60 * 1000 // days
    };

    const match = timeRange.match(/^(\d+)([mhd])$/);
    if (!match) {
      return 24 * 60 * 60 * 1000; // Default to 24 hours
    }

    const [, value, unit] = match;
    return parseInt(value) * multipliers[unit];
  }

  // Get cache statistics
  getCacheStats() {
    let expired = 0;
    const now = Date.now();

    for (const [, value] of this.queryCache.entries()) {
      if (value.expiry < now) {
        expired++;
      }
    }

    return {
      totalEntries: this.queryCache.size,
      expiredEntries: expired,
      activeEntries: this.queryCache.size - expired,
      memoryUsage: JSON.stringify([...this.queryCache]).length
    };
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

export default performanceOptimizer;
