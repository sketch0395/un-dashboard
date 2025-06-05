#!/bin/bash

# UN Dashboard MongoDB Initialization Script - Enhanced
# Enhanced for comprehensive authentication system with security features
# This script sets up the database, collections, indexes, and default admin user
# Supports: CSRF protection, rate limiting, performance optimization, audit logging

mongosh --eval "
db = db.getSiblingDB('un_dashboard');

// Create application user with secure credentials
db.createUser({
  user: 'un_app',
  pwd: 'un_app_password_2024',
  roles: [
    { role: 'readWrite', db: 'un_dashboard' }
  ]
});

print('✓ Database user created successfully');

// Enhanced Users Collection with security fields
db.createCollection('users', {
  validator: {
    \$jsonSchema: {
      bsonType: 'object',
      required: ['username', 'email', 'password', 'createdAt'],
      properties: {
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 30
        },
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 60 // For bcrypt hash
        },
        role: {
          enum: ['admin', 'user', 'viewer'],
          default: 'user'
        },
        isActive: {
          bsonType: 'bool',
          default: true
        },
        isLocked: {
          bsonType: 'bool',
          default: false
        },
        lockUntil: {
          bsonType: 'date'
        },
        loginAttempts: {
          bsonType: 'int',
          minimum: 0,
          default: 0
        },
        lastLogin: {
          bsonType: 'date'
        },
        lastLoginIP: {
          bsonType: 'string'
        },
        passwordChangedAt: {
          bsonType: 'date'
        },
        twoFactorEnabled: {
          bsonType: 'bool',
          default: false
        },
        twoFactorSecret: {
          bsonType: 'string'
        },
        emailVerified: {
          bsonType: 'bool',
          default: false
        },
        emailVerificationToken: {
          bsonType: 'string'
        },
        passwordResetToken: {
          bsonType: 'string'
        },
        passwordResetExpires: {
          bsonType: 'date'
        },
        securityEvents: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              event: { bsonType: 'string' },
              timestamp: { bsonType: 'date' },
              ipAddress: { bsonType: 'string' },
              userAgent: { bsonType: 'string' }
            }
          }
        },
        createdAt: {
          bsonType: 'date'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});
print('✓ Users collection created with enhanced security validation');

// Enhanced Sessions Collection
db.createCollection('sessions', {
  validator: {
    \$jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'sessionId', 'token', 'createdAt', 'expiresAt'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        sessionId: {
          bsonType: 'string'
        },
        token: {
          bsonType: 'string'
        },
        refreshToken: {
          bsonType: 'string'
        },
        ipAddress: {
          bsonType: 'string'
        },
        userAgent: {
          bsonType: 'string'
        },
        isActive: {
          bsonType: 'bool',
          default: true
        },
        lastActivity: {
          bsonType: 'date'
        },
        terminatedAt: {
          bsonType: 'date'
        },
        terminationReason: {
          bsonType: 'string'
        },
        createdAt: {
          bsonType: 'date'
        },
        expiresAt: {
          bsonType: 'date'
        }
      }
    }
  }
});
print('✓ Sessions collection created with enhanced tracking');

// Rate Limiting Collection
db.createCollection('rate_limits', {
  validator: {
    \$jsonSchema: {
      bsonType: 'object',
      required: ['identifier', 'count', 'resetTime'],
      properties: {
        identifier: {
          bsonType: 'string'
        },
        endpoint: {
          bsonType: 'string'
        },
        count: {
          bsonType: 'int',
          minimum: 0
        },
        resetTime: {
          bsonType: 'date'
        },
        createdAt: {
          bsonType: 'date'
        }
      }
    }
  }
});
print('✓ Rate limiting collection created');

// CSRF Tokens Collection
db.createCollection('csrf_tokens', {
  validator: {
    \$jsonSchema: {
      bsonType: 'object',
      required: ['token', 'sessionId', 'createdAt', 'expiresAt'],
      properties: {
        token: {
          bsonType: 'string'
        },
        sessionId: {
          bsonType: 'string'
        },
        used: {
          bsonType: 'bool',
          default: false
        },
        usedAt: {
          bsonType: 'date'
        },
        createdAt: {
          bsonType: 'date'
        },
        expiresAt: {
          bsonType: 'date'
        }
      }
    }
  }
});
print('✓ CSRF tokens collection created');

// Enhanced Audit Logs Collection
db.createCollection('audit_logs', {
  validator: {
    \$jsonSchema: {
      bsonType: 'object',
      required: ['action', 'timestamp'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        sessionId: {
          bsonType: 'string'
        },
        action: {
          bsonType: 'string'
        },
        category: {
          enum: ['auth', 'user', 'admin', 'security', 'system'],
          default: 'system'
        },
        severity: {
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'low'
        },
        status: {
          enum: ['success', 'failure', 'error'],
          default: 'success'
        },
        details: {
          bsonType: 'object'
        },
        ipAddress: {
          bsonType: 'string'
        },
        userAgent: {
          bsonType: 'string'
        },
        errorMessage: {
          bsonType: 'string'
        },
        duration: {
          bsonType: 'int'
        },
        timestamp: {
          bsonType: 'date'
        }
      }
    }
  }
});
print('✓ Enhanced audit logs collection created');

// Performance Metrics Collection
db.createCollection('performance_metrics', {
  validator: {
    \$jsonSchema: {
      bsonType: 'object',
      required: ['metric', 'value', 'timestamp'],
      properties: {
        metric: {
          bsonType: 'string'
        },
        value: {
          bsonType: ['double', 'int']
        },
        category: {
          enum: ['response_time', 'throughput', 'error_rate', 'memory', 'cpu', 'database']
        },
        endpoint: {
          bsonType: 'string'
        },
        tags: {
          bsonType: 'object'
        },
        timestamp: {
          bsonType: 'date'
        }
      }
    }
  }
});
print('✓ Performance metrics collection created');

// Security Events Collection
db.createCollection('security_events', {
  validator: {
    \$jsonSchema: {
      bsonType: 'object',
      required: ['event', 'severity', 'timestamp'],
      properties: {
        event: {
          bsonType: 'string'
        },
        severity: {
          enum: ['low', 'medium', 'high', 'critical']
        },
        category: {
          enum: ['authentication', 'authorization', 'rate_limit', 'csrf', 'injection', 'other']
        },
        userId: {
          bsonType: 'objectId'
        },
        sessionId: {
          bsonType: 'string'
        },
        ipAddress: {
          bsonType: 'string'
        },
        userAgent: {
          bsonType: 'string'
        },
        details: {
          bsonType: 'object'
        },
        resolved: {
          bsonType: 'bool',
          default: false
        },
        resolvedAt: {
          bsonType: 'date'
        },
        resolvedBy: {
          bsonType: 'objectId'
        },
        timestamp: {
          bsonType: 'date'
        }
      }
    }
  }
});
print('✓ Security events collection created');

// Email Queue Collection
db.createCollection('email_queue', {
  validator: {
    \$jsonSchema: {
      bsonType: 'object',
      required: ['to', 'subject', 'template', 'status', 'createdAt'],
      properties: {
        to: {
          bsonType: 'string'
        },
        subject: {
          bsonType: 'string'
        },
        template: {
          bsonType: 'string'
        },
        data: {
          bsonType: 'object'
        },
        status: {
          enum: ['pending', 'sending', 'sent', 'failed'],
          default: 'pending'
        },
        attempts: {
          bsonType: 'int',
          minimum: 0,
          default: 0
        },
        lastAttempt: {
          bsonType: 'date'
        },
        sentAt: {
          bsonType: 'date'
        },
        errorMessage: {
          bsonType: 'string'
        },
        priority: {
          enum: ['low', 'normal', 'high', 'urgent'],
          default: 'normal'
        },
        createdAt: {
          bsonType: 'date'
        }
      }
    }
  }
});
print('✓ Email queue collection created');

// User Preferences Collection (Enhanced)
db.createCollection('user_preferences', {
  validator: {
    \$jsonSchema: {
      bsonType: 'object',
      required: ['userId'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        theme: {
          enum: ['dark', 'light', 'auto'],
          default: 'dark'
        },
        language: {
          bsonType: 'string',
          default: 'en'
        },
        timezone: {
          bsonType: 'string',
          default: 'UTC'
        },
        dashboardLayout: {
          bsonType: 'object'
        },
        notifications: {
          bsonType: 'object',
          properties: {
            email: { bsonType: 'bool', default: true },
            security: { bsonType: 'bool', default: true },
            system: { bsonType: 'bool', default: true }
          }
        },
        security: {
          bsonType: 'object',
          properties: {
            sessionTimeout: { bsonType: 'int', default: 3600 },
            requireTwoFactor: { bsonType: 'bool', default: false },
            allowMultipleSessions: { bsonType: 'bool', default: true }
          }
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});
print('✓ Enhanced user preferences collection created');

// Performance Indexes for Users
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ isLocked: 1 });
db.users.createIndex({ lastLogin: -1 });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ lockUntil: 1 }, { sparse: true });
db.users.createIndex({ passwordResetToken: 1 }, { sparse: true });
db.users.createIndex({ emailVerificationToken: 1 }, { sparse: true });

// Performance Indexes for Sessions
db.sessions.createIndex({ sessionId: 1 }, { unique: true });
db.sessions.createIndex({ token: 1 }, { unique: true });
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.sessions.createIndex({ isActive: 1 });
db.sessions.createIndex({ lastActivity: -1 });
db.sessions.createIndex({ ipAddress: 1 });

// Performance Indexes for Rate Limiting
db.rate_limits.createIndex({ identifier: 1, endpoint: 1 }, { unique: true });
db.rate_limits.createIndex({ resetTime: 1 }, { expireAfterSeconds: 0 });

// Performance Indexes for CSRF Tokens
db.csrf_tokens.createIndex({ token: 1 }, { unique: true });
db.csrf_tokens.createIndex({ sessionId: 1 });
db.csrf_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Performance Indexes for Audit Logs
db.audit_logs.createIndex({ userId: 1, timestamp: -1 });
db.audit_logs.createIndex({ action: 1, timestamp: -1 });
db.audit_logs.createIndex({ category: 1, timestamp: -1 });
db.audit_logs.createIndex({ severity: 1, timestamp: -1 });
db.audit_logs.createIndex({ timestamp: -1 });
db.audit_logs.createIndex({ ipAddress: 1, timestamp: -1 });

// Performance Indexes for Performance Metrics
db.performance_metrics.createIndex({ metric: 1, timestamp: -1 });
db.performance_metrics.createIndex({ category: 1, timestamp: -1 });
db.performance_metrics.createIndex({ endpoint: 1, timestamp: -1 });
db.performance_metrics.createIndex({ timestamp: -1 });

// Performance Indexes for Security Events
db.security_events.createIndex({ severity: 1, timestamp: -1 });
db.security_events.createIndex({ category: 1, timestamp: -1 });
db.security_events.createIndex({ resolved: 1, timestamp: -1 });
db.security_events.createIndex({ userId: 1, timestamp: -1 });
db.security_events.createIndex({ ipAddress: 1, timestamp: -1 });

// Performance Indexes for Email Queue
db.email_queue.createIndex({ status: 1, priority: -1, createdAt: 1 });
db.email_queue.createIndex({ createdAt: -1 });

// Performance Indexes for User Preferences
db.user_preferences.createIndex({ userId: 1 }, { unique: true });

print('✓ All performance indexes created successfully');

// Create default admin user with secure password
// Note: This is a placeholder - actual password should be set during deployment
const adminUser = {
  username: 'admin',
  email: 'admin@un-dashboard.local',
  password: '\$2b\$12\$placeholder.hash.will.be.replaced.by.application',
  role: 'admin',
  isActive: true,
  isLocked: false,
  loginAttempts: 0,
  emailVerified: true,
  twoFactorEnabled: false,
  securityEvents: [],
  createdAt: new Date(),
  updatedAt: new Date()
};

try {
  db.users.insertOne(adminUser);
  print('✓ Default admin user created (password must be set via application)');
} catch (error) {
  if (error.code === 11000) {
    print('⚠ Admin user already exists, skipping creation');
  } else {
    print('✗ Error creating admin user: ' + error.message);
  }
}

// Create default admin preferences
try {
  db.user_preferences.insertOne({
    userId: db.users.findOne({ username: 'admin' })._id,
    theme: 'dark',
    language: 'en',
    timezone: 'UTC',
    dashboardLayout: {},
    notifications: {
      email: true,
      security: true,
      system: true
    },
    security: {
      sessionTimeout: 3600,
      requireTwoFactor: false,
      allowMultipleSessions: true
    },
    updatedAt: new Date()
  });
  print('✓ Default admin preferences created');
} catch (error) {
  print('⚠ Admin preferences may already exist or admin user not found');
}

// Create initial security event for system initialization
try {
  db.security_events.insertOne({
    event: 'system_initialization',
    severity: 'low',
    category: 'other',
    details: {
      message: 'Database initialized with enhanced security collections',
      version: '2.0',
      collections_created: [
        'users', 'sessions', 'rate_limits', 'csrf_tokens', 
        'audit_logs', 'performance_metrics', 'security_events', 
        'email_queue', 'user_preferences'
      ]
    },
    resolved: true,
    resolvedAt: new Date(),
    timestamp: new Date()
  });
  print('✓ Initial security event logged');
} catch (error) {
  print('⚠ Could not create initial security event: ' + error.message);
}

print('');
print('🎉 Enhanced UN Dashboard database initialization complete!');
print('');
print('📊 Collections created:');
print('   • users (with enhanced security fields)');
print('   • sessions (with activity tracking)');
print('   • rate_limits (for API protection)');
print('   • csrf_tokens (for CSRF protection)');
print('   • audit_logs (enhanced logging)');
print('   • performance_metrics (monitoring)');
print('   • security_events (security monitoring)');
print('   • email_queue (notification system)');
print('   • user_preferences (enhanced settings)');
print('');
print('🔐 Security features enabled:');
print('   • Account lockout protection');
print('   • Session management');
print('   • Rate limiting support');
print('   • CSRF protection');
print('   • Comprehensive audit logging');
print('   • Security event monitoring');
print('   • Email notification queuing');
print('');
print('⚠️  Important: Set admin password via application before production use!');
print('');
"
