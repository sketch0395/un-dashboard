# MongoDB Schema Documentation - UN Dashboard Enhanced Authentication System

## Overview

This document describes the enhanced MongoDB schema for the UN Dashboard authentication system, supporting comprehensive security features including CSRF protection, rate limiting, performance optimization, and advanced security monitoring.

## Collections

### 1. Users Collection (`users`)

Enhanced user collection with comprehensive security features:

```javascript
{
  _id: ObjectId,
  username: String (3-30 chars, unique),
  email: String (unique, validated),
  password: String (bcrypt hash, min 60 chars),
  role: Enum ['admin', 'user', 'viewer'],
  isActive: Boolean,
  isLocked: Boolean,
  lockUntil: Date (optional),
  loginAttempts: Number,
  lastLogin: Date,
  lastLoginIP: String,
  passwordChangedAt: Date,
  twoFactorEnabled: Boolean,
  twoFactorSecret: String (optional),
  emailVerified: Boolean,
  emailVerificationToken: String (optional),
  passwordResetToken: String (optional),
  passwordResetExpires: Date (optional),
  securityEvents: Array[{
    event: String,
    timestamp: Date,
    ipAddress: String,
    userAgent: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `username` (unique)
- `email` (unique)
- `role`
- `isActive`
- `isLocked`
- `lastLogin` (descending)
- `createdAt` (descending)
- `lockUntil` (sparse)
- `passwordResetToken` (sparse)
- `emailVerificationToken` (sparse)

### 2. Sessions Collection (`sessions`)

Enhanced session management with activity tracking:

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  sessionId: String (unique),
  token: String (unique),
  refreshToken: String (optional),
  ipAddress: String,
  userAgent: String,
  isActive: Boolean,
  lastActivity: Date,
  terminatedAt: Date (optional),
  terminationReason: String (optional),
  createdAt: Date,
  expiresAt: Date
}
```

**Indexes:**
- `sessionId` (unique)
- `token` (unique)
- `userId`
- `expiresAt` (TTL index)
- `isActive`
- `lastActivity` (descending)
- `ipAddress`

### 3. Rate Limits Collection (`rate_limits`)

API rate limiting support:

```javascript
{
  _id: ObjectId,
  identifier: String, // IP address or user ID
  endpoint: String (optional),
  count: Number,
  resetTime: Date,
  createdAt: Date
}
```

**Indexes:**
- `identifier + endpoint` (unique compound)
- `resetTime` (TTL index)

### 4. CSRF Tokens Collection (`csrf_tokens`)

CSRF protection token management:

```javascript
{
  _id: ObjectId,
  token: String (unique),
  sessionId: String,
  used: Boolean,
  usedAt: Date (optional),
  createdAt: Date,
  expiresAt: Date
}
```

**Indexes:**
- `token` (unique)
- `sessionId`
- `expiresAt` (TTL index)

### 5. Audit Logs Collection (`audit_logs`)

Enhanced comprehensive audit logging:

```javascript
{
  _id: ObjectId,
  userId: ObjectId (optional),
  sessionId: String (optional),
  action: String,
  category: Enum ['auth', 'user', 'admin', 'security', 'system'],
  severity: Enum ['low', 'medium', 'high', 'critical'],
  status: Enum ['success', 'failure', 'error'],
  details: Object,
  ipAddress: String,
  userAgent: String,
  errorMessage: String (optional),
  duration: Number (optional, in ms),
  timestamp: Date
}
```

**Indexes:**
- `userId + timestamp` (compound, descending)
- `action + timestamp` (compound, descending)
- `category + timestamp` (compound, descending)
- `severity + timestamp` (compound, descending)
- `timestamp` (descending)
- `ipAddress + timestamp` (compound, descending)

### 6. Performance Metrics Collection (`performance_metrics`)

System performance monitoring:

```javascript
{
  _id: ObjectId,
  metric: String,
  value: Number,
  category: Enum ['response_time', 'throughput', 'error_rate', 'memory', 'cpu', 'database'],
  endpoint: String (optional),
  tags: Object,
  timestamp: Date
}
```

**Indexes:**
- `metric + timestamp` (compound, descending)
- `category + timestamp` (compound, descending)
- `endpoint + timestamp` (compound, descending)
- `timestamp` (descending)

### 7. Security Events Collection (`security_events`)

Security incident tracking:

```javascript
{
  _id: ObjectId,
  event: String,
  severity: Enum ['low', 'medium', 'high', 'critical'],
  category: Enum ['authentication', 'authorization', 'rate_limit', 'csrf', 'injection', 'other'],
  userId: ObjectId (optional),
  sessionId: String (optional),
  ipAddress: String,
  userAgent: String,
  details: Object,
  resolved: Boolean,
  resolvedAt: Date (optional),
  resolvedBy: ObjectId (optional),
  timestamp: Date
}
```

**Indexes:**
- `severity + timestamp` (compound, descending)
- `category + timestamp` (compound, descending)
- `resolved + timestamp` (compound, descending)
- `userId + timestamp` (compound, descending)
- `ipAddress + timestamp` (compound, descending)

### 8. Email Queue Collection (`email_queue`)

Email notification system:

```javascript
{
  _id: ObjectId,
  to: String,
  subject: String,
  template: String,
  data: Object,
  status: Enum ['pending', 'sending', 'sent', 'failed'],
  attempts: Number,
  lastAttempt: Date (optional),
  sentAt: Date (optional),
  errorMessage: String (optional),
  priority: Enum ['low', 'normal', 'high', 'urgent'],
  createdAt: Date
}
```

**Indexes:**
- `status + priority + createdAt` (compound)
- `createdAt` (descending)

### 9. User Preferences Collection (`user_preferences`)

Enhanced user settings:

```javascript
{
  _id: ObjectId,
  userId: ObjectId (unique),
  theme: Enum ['dark', 'light', 'auto'],
  language: String,
  timezone: String,
  dashboardLayout: Object,
  notifications: {
    email: Boolean,
    security: Boolean,
    system: Boolean
  },
  security: {
    sessionTimeout: Number,
    requireTwoFactor: Boolean,
    allowMultipleSessions: Boolean
  },
  updatedAt: Date
}
```

**Indexes:**
- `userId` (unique)

## Security Features Supported

### 1. Account Lockout Protection
- `isLocked` and `lockUntil` fields in users collection
- `loginAttempts` tracking for progressive lockout

### 2. Session Management
- Comprehensive session tracking with activity monitoring
- Session termination tracking with reasons
- Multi-session support with device tracking

### 3. Rate Limiting
- IP-based and user-based rate limiting
- Endpoint-specific rate limiting support
- Automatic cleanup with TTL indexes

### 4. CSRF Protection
- Token-based CSRF protection
- Single-use token support
- Session-linked token validation

### 5. Audit Trail
- Comprehensive action logging
- Security event categorization
- Performance metric tracking

### 6. Email Notifications
- Queued email system for security notifications
- Priority-based email processing
- Retry mechanism with failure tracking

## Performance Optimizations

### 1. Indexing Strategy
- Strategic compound indexes for common query patterns
- TTL indexes for automatic cleanup
- Sparse indexes for optional fields

### 2. Data Lifecycle Management
- Automatic session cleanup
- Rate limit record expiration
- CSRF token cleanup

### 3. Query Optimization
- Optimized for authentication flows
- Efficient security event queries
- Performance monitoring queries

## Usage Examples

### User Authentication Flow
1. User login creates session record
2. CSRF token generated and stored
3. Rate limiting checked against identifier
4. Audit log entry created
5. Security event logged if suspicious

### Session Management
1. Session validation checks active status
2. Activity updated on each request
3. Cleanup service removes expired sessions
4. Email notifications for session events

### Security Monitoring
1. Security events logged in real-time
2. Performance metrics collected
3. Admin interface for monitoring
4. Email alerts for critical events

## Migration from Basic Schema

If upgrading from the basic schema:

1. **Backup existing data**
2. **Run enhanced initialization script**
3. **Migrate existing user data** (add new security fields)
4. **Update application configuration**
5. **Test all authentication flows**

## Maintenance

### Regular Tasks
- Monitor collection sizes
- Review security events
- Clean up old audit logs
- Update indexes as needed

### Performance Monitoring
- Track query performance
- Monitor index usage
- Review slow operations
- Optimize based on usage patterns

---

This enhanced schema provides a robust foundation for the UN Dashboard authentication system with comprehensive security, performance, and monitoring capabilities.
