const AuditLog = require('../models/AuditLog');

class AuditLogger {    /**
     * Log an audit event
     * @param {Object} params - Audit log parameters
     * @param {string} params.action - Action performed (e.g., 'USER_LOGIN', 'USER_APPROVED')
     * @param {string} params.description - Human-readable description
     * @param {string} [params.level='info'] - Log level (info, success, warning, error)
     * @param {string} [params.userId] - ID of the user who performed the action
     * @param {string} [params.targetUserId] - ID of the user being acted upon
     * @param {string} [params.ipAddress] - IP address of the request
     * @param {string} [params.userAgent] - User agent string
     * @param {Object} [params.details] - Additional details object
     */
    static async log({
        action,
        description,
        level = 'info',
        userId = null,
        targetUserId = null,
        ipAddress = null,
        userAgent = null,
        details = null
    }) {
        try {
            // Map action to eventType for schema compatibility
            let eventType = 'SYSTEM';
            if (action.includes('LOGIN')) {
                eventType = action.includes('FAILED') ? 'FAILED_LOGIN' : 'LOGIN';
            } else if (action.includes('LOGOUT')) {
                eventType = 'LOGOUT';
            } else if (action.includes('REGISTER')) {
                eventType = 'USER_REGISTRATION';
            } else if (action.includes('APPROVED')) {
                eventType = 'USER_APPROVAL';
            } else if (action.includes('REJECTED')) {
                eventType = 'USER_REJECTION';
            } else if (action.includes('PASSWORD')) {
                eventType = 'PASSWORD_CHANGE';
            } else if (action.includes('ADMIN')) {
                eventType = 'ADMIN_ACTION';
            }

            const auditLog = new AuditLog({
                eventType,
                action,
                description,
                level,
                userId,
                targetUserId,
                ipAddress: ipAddress || 'unknown',
                userAgent,
                details,
                timestamp: new Date()
            });

            await auditLog.save();
            return auditLog;
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // Don't throw error as audit logging should not break the main functionality
            return null;
        }
    }

    /**
     * Log user authentication events
     */
    static async logUserLogin(userId, ipAddress, userAgent, success = true) {
        return this.log({
            action: success ? 'USER_LOGIN' : 'USER_LOGIN_FAILED',
            description: success ? 'User logged in successfully' : 'User login failed',
            level: success ? 'success' : 'warning',
            userId,
            ipAddress,
            userAgent
        });
    }

    static async logUserLogout(userId, ipAddress, userAgent) {
        return this.log({
            action: 'USER_LOGOUT',
            description: 'User logged out',
            level: 'info',
            userId,
            ipAddress,
            userAgent
        });
    }

    static async logUserRegistration(userId, ipAddress, userAgent) {
        return this.log({
            action: 'USER_REGISTER',
            description: 'New user registered',
            level: 'info',
            userId,
            ipAddress,
            userAgent
        });
    }

    /**
     * Log admin actions
     */
    static async logUserApproval(adminUserId, targetUserId, ipAddress, userAgent, userDetails = {}) {
        return this.log({
            action: 'USER_APPROVED',
            description: `Admin approved user registration for ${userDetails.username || 'user'}`,
            level: 'success',
            userId: adminUserId,
            targetUserId,
            ipAddress,
            userAgent,
            details: {
                targetUser: userDetails
            }
        });
    }

    static async logUserRejection(adminUserId, targetUserId, ipAddress, userAgent, userDetails = {}) {
        return this.log({
            action: 'USER_REJECTED',
            description: `Admin rejected user registration for ${userDetails.username || 'user'}`,
            level: 'warning',
            userId: adminUserId,
            targetUserId,
            ipAddress,
            userAgent,
            details: {
                targetUser: userDetails
            }
        });
    }

    static async logBulkUserApproval(adminUserId, userIds, ipAddress, userAgent, count) {
        return this.log({
            action: 'BULK_USER_APPROVED',
            description: `Admin bulk approved ${count} user registrations`,
            level: 'success',
            userId: adminUserId,
            ipAddress,
            userAgent,
            details: {
                userIds,
                count
            }
        });
    }

    static async logBulkUserRejection(adminUserId, userIds, ipAddress, userAgent, count) {
        return this.log({
            action: 'BULK_USER_REJECTED',
            description: `Admin bulk rejected ${count} user registrations`,
            level: 'warning',
            userId: adminUserId,
            ipAddress,
            userAgent,
            details: {
                userIds,
                count
            }
        });
    }

    /**
     * Log password and security events
     */
    static async logPasswordChange(userId, ipAddress, userAgent, success = true) {
        return this.log({
            action: 'PASSWORD_CHANGE',
            description: success ? 'User changed password successfully' : 'Password change failed',
            level: success ? 'success' : 'warning',
            userId,
            ipAddress,
            userAgent
        });
    }

    static async logProfileUpdate(userId, ipAddress, userAgent, changedFields = []) {
        return this.log({
            action: 'PROFILE_UPDATE',
            description: 'User updated profile information',
            level: 'info',
            userId,
            ipAddress,
            userAgent,
            details: {
                changedFields
            }
        });
    }

    /**
     * Log system and error events
     */
    static async logSystemError(error, userId = null, ipAddress = null, userAgent = null) {
        return this.log({
            action: 'SYSTEM_ERROR',
            description: `System error: ${error.message}`,
            level: 'error',
            userId,
            ipAddress,
            userAgent,
            details: {
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                }
            }
        });
    }

    static async logSecurityEvent(action, description, level = 'warning', userId = null, ipAddress = null, userAgent = null, details = null) {
        return this.log({
            action: `SECURITY_${action.toUpperCase()}`,
            description,
            level,
            userId,
            ipAddress,
            userAgent,
            details
        });
    }    /**
     * Utility method to extract request info
     */
    static getRequestInfo(request) {
        const ipAddress = request.headers.get('x-forwarded-for') ||
                         request.headers.get('x-real-ip') ||
                         request.ip ||
                         'unknown';
        
        const userAgent = request.headers.get('user-agent') || 'unknown';
        
        return { ipAddress, userAgent };
    }

    /**
     * Methods expected by auth routes
     */
    static async logSuccessfulLogin(userId, ipAddress, userAgent, details = {}) {
        return this.log({
            action: 'LOGIN',
            description: 'User logged in successfully',
            level: 'success',
            userId,
            ipAddress,
            userAgent,
            details
        });
    }

    static async logFailedLogin(userId, username, reason, ipAddress, userAgent) {
        return this.log({
            action: 'FAILED_LOGIN',
            description: `Login failed for ${username}: ${reason}`,
            level: 'warning',
            userId,
            ipAddress,
            userAgent,
            details: { username, reason }
        });
    }

    static async logLogout(userId, ipAddress, userAgent, details = {}) {
        return this.log({
            action: 'LOGOUT',
            description: 'User logged out',
            level: 'info',
            userId,
            ipAddress,
            userAgent,
            details
        });
    }

    static async logPasswordChange(userId, ipAddress, userAgent) {
        return this.log({
            action: 'PASSWORD_CHANGE',
            description: 'User changed password',
            level: 'info',
            userId,
            ipAddress,
            userAgent
        });
    }

    static async logSystemError(error, ipAddress, userAgent, details = {}) {
        return this.log({
            action: 'SYSTEM_ERROR',
            description: `System error: ${error}`,
            level: 'error',
            userId: null,
            ipAddress,
            userAgent,
            details: { error, ...details }
        });
    }

    static async logEvent(eventType, action, userId, details = {}) {
        return this.log({
            action: action,
            description: `${eventType}: ${action}`,
            level: 'info',
            userId,
            ipAddress: 'system',
            userAgent: 'system',
            details
        });
    }
}

module.exports = AuditLogger;