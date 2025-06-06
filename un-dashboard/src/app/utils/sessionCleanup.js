// Session cleanup service with automatic and manual cleanup capabilities
import dbConnection from '../../../lib/db';
import Session from '../../../models/Session';
import AuditLogger from '../../../services/auditLogger';
import { performanceOptimizer } from './performanceOptimizer';

class SessionCleanupService {
  constructor() {
    this.cleanupInterval = null;
    this.isRunning = false;
    this.stats = {
      lastCleanup: null,
      totalCleaned: 0,
      errors: 0,
      startTime: new Date()
    };
    this.config = {
      intervalMinutes: process.env.NODE_ENV === 'production' ? 60 : 30,
      maxInactiveHours: 24,
      batchSize: 1000
    };
  }

  // Start the cleanup service
  start(intervalMinutes = 60) {
    if (this.isRunning) {
      console.log('Session cleanup service is already running');
      return;
    }

    console.log(`Starting session cleanup service (interval: ${intervalMinutes} minutes)`);
    
    // Run initial cleanup
    this.runCleanup();
    
    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMinutes * 60 * 1000);
    
    this.isRunning = true;
  }

  // Stop the cleanup service
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('Session cleanup service stopped');
  }

  // Run cleanup process
  async runCleanup() {
    try {
      console.log('Running session cleanup...');
      const startTime = Date.now();
      
      await dbConnection.connectMongoDB();
        // Find expired sessions
      const expiredSessions = await Session.find({
        expiresAt: { $lt: new Date() }
      });

      console.log(`Found ${expiredSessions.length} expired sessions to clean up`);

      if (expiredSessions.length > 0) {
        // Log cleanup for audit trail
        await AuditLogger.logEvent('SYSTEM', 'session_cleanup_started', 'system', {
          expiredSessionCount: expiredSessions.length,
          details: 'Automatic session cleanup initiated'
        });        // Delete expired sessions
        const deleteResult = await Session.deleteMany({
          expiresAt: { $lt: new Date() }
        });

        // Update statistics
        this.stats.lastCleanupCount = deleteResult.deletedCount;
        this.stats.totalCleaned += deleteResult.deletedCount;
        this.lastCleanup = new Date();

        // Log completion
        await AuditLogger.logEvent('SYSTEM', 'session_cleanup_completed', 'system', {
          cleanedCount: deleteResult.deletedCount,
          duration: Date.now() - startTime,
          details: 'Automatic session cleanup completed successfully'
        });

        console.log(`Session cleanup completed: ${deleteResult.deletedCount} sessions removed`);
      } else {
        this.stats.lastCleanupCount = 0;
        this.lastCleanup = new Date();
        console.log('Session cleanup completed: No expired sessions found');
      }

    } catch (error) {
      this.stats.errors++;
      console.error('Session cleanup error:', error);
      
      // Log error for audit trail
      try {
        await AuditLogger.logEvent('SYSTEM', 'session_cleanup_error', 'system', {
          error: error.message,
          details: 'Session cleanup encountered an error'
        });
      } catch (logError) {
        console.error('Failed to log cleanup error:', logError);
      }
    }
  }

  // Manual cleanup with options
  async manualCleanup(options = {}) {
    const {
      olderThanDays = 0,
      userId = null,
      inactive = false
    } = options;

    try {
      await dbConnection.connectMongoDB();
      
      let query = {};
      
      // Add time-based filter
      if (olderThanDays > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        query.createdAt = { $lt: cutoffDate };
      }
      
      // Add user filter
      if (userId) {
        query.userId = userId;
      }
      
      // Add inactive session filter
      if (inactive) {
        const inactiveThreshold = new Date();
        inactiveThreshold.setMinutes(inactiveThreshold.getMinutes() - 30); // 30 minutes
        query.lastActivity = { $lt: inactiveThreshold };
      }
      
      // If no specific filters, only clean expired sessions
      if (Object.keys(query).length === 0) {
        query.expiresAt = { $lt: new Date() };
      }      const sessionsToDelete = await Session.find(query);
      const deleteResult = await Session.deleteMany(query);

      // Log manual cleanup
      await AuditLogger.logEvent('ADMIN', 'manual_session_cleanup', 'system', {
        cleanedCount: deleteResult.deletedCount,
        filter: query,
        details: 'Manual session cleanup performed'
      });

      return {
        success: true,
        deletedCount: deleteResult.deletedCount,
        message: `Successfully cleaned ${deleteResult.deletedCount} sessions`
      };

    } catch (error) {
      console.error('Manual session cleanup error:', error);
      
      await AuditLogger.logEvent('ADMIN', 'manual_session_cleanup_error', 'system', {
        error: error.message,
        details: 'Manual session cleanup encountered an error'
      });

      return {
        success: false,
        error: error.message,
        message: 'Failed to perform manual cleanup'
      };
    }
  }

  // Get cleanup statistics
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      lastCleanup: this.lastCleanup,
      nextCleanup: this.cleanupInterval ? 
        new Date(Date.now() + (this.cleanupInterval._idleTimeout || 0)) : 
        null
    };
  }

  // Enhanced session statistics using performance optimizer
  async getSessionStats() {
    try {
      return await performanceOptimizer.getSessionStats();
    } catch (error) {
      console.error('Error getting session stats:', error);
      return { statuses: [], total: 0 };
    }
  }

  // Enhanced cleanup with batch processing
  async performCleanup(options = {}) {
    const {
      maxAge = this.config.maxInactiveHours * 60 * 60 * 1000,
      userId = null,
      includeInactiveSessions = true,
      batchSize = this.config.batchSize
    } = options;

    try {
      const criteria = {};
      
      if (userId) {
        criteria.userId = userId;
      }

      if (includeInactiveSessions) {
        criteria.lastActivity = { $lt: new Date(Date.now() - maxAge) };
      }

      const result = await performanceOptimizer.cleanupSessionsBatch(criteria, batchSize);
      
      this.stats.totalCleaned += result.deleted;
      this.stats.lastCleanup = new Date();

      return result;
    } catch (error) {
      console.error('Session cleanup error:', error);
      this.stats.errors++;
      throw error;
    }
  }

  // Cleanup sessions for a specific user
  async cleanupUserSessions(userId, keepCurrent = true, currentSessionId = null) {
    try {
      await dbConnection.connectMongoDB();
      
      let query = { userId };
      
      // Keep current session if specified
      if (keepCurrent && currentSessionId) {
        query.sessionId = { $ne: currentSessionId };
      }

      const deleteResult = await Session.deleteMany(query);

      await AuditLogger.logEvent('USER', 'user_sessions_cleanup', userId, {
        cleanedCount: deleteResult.deletedCount,
        keepCurrent,
        currentSessionId,
        details: 'User sessions cleaned up'
      });

      return {
        success: true,
        deletedCount: deleteResult.deletedCount
      };

    } catch (error) {
      console.error('Error cleaning user sessions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
export const sessionCleanupService = new SessionCleanupService();

// Auto-start the service in production
if (process.env.NODE_ENV === 'production') {
  // Start cleanup service with 1-hour interval
  sessionCleanupService.start(60);
} else if (process.env.NODE_ENV === 'development') {
  // Start cleanup service with 30-minute interval for development
  sessionCleanupService.start(30);
}

export default sessionCleanupService;
