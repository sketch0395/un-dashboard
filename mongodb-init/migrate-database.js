#!/bin/bash

# UN Dashboard Database Migration Script
# Migrates existing basic database to enhanced authentication system
# Run this script if you have an existing UN Dashboard database

mongosh --eval "
db = db.getSiblingDB('un_dashboard');

print('🔄 Starting database migration to enhanced authentication system...');
print('');

// Backup existing collections
const backupSuffix = '_backup_' + new Date().toISOString().replace(/[:.]/g, '-');

// Function to backup collection if it exists
function backupCollection(collectionName) {
  if (db[collectionName].countDocuments() > 0) {
    const backupName = collectionName + backupSuffix;
    db[collectionName].aggregate([{ \$out: backupName }]);
    print('✓ Backed up ' + collectionName + ' to ' + backupName);
    return true;
  }
  return false;
}

// Backup existing collections
const existingCollections = db.listCollectionNames();
print('📦 Creating backups of existing collections...');

existingCollections.forEach(function(collectionName) {
  if (!collectionName.includes('_backup_')) {
    backupCollection(collectionName);
  }
});

print('');
print('🔧 Migrating existing users collection...');

// Migrate users collection - add new security fields
if (existingCollections.includes('users')) {
  db.users.updateMany(
    {},
    {
      \$set: {
        isLocked: false,
        loginAttempts: 0,
        emailVerified: true, // Assume existing users are verified
        twoFactorEnabled: false,
        securityEvents: []
      },
      \$unset: {
        // Remove any deprecated fields if they exist
      }
    }
  );
  
  // Add indexes that might be missing
  try {
    db.users.createIndex({ isLocked: 1 });
    db.users.createIndex({ lockUntil: 1 }, { sparse: true });
    db.users.createIndex({ passwordResetToken: 1 }, { sparse: true });
    db.users.createIndex({ emailVerificationToken: 1 }, { sparse: true });
    print('✓ Users collection migrated with new security fields');
  } catch (error) {
    print('⚠ Some user indexes may already exist: ' + error.message);
  }
}

print('');
print('🔧 Migrating existing sessions collection...');

// Migrate sessions collection - add new tracking fields
if (existingCollections.includes('sessions')) {
  db.sessions.updateMany(
    {},
    {
      \$set: {
        isActive: true,
        lastActivity: new Date()
      }
    }
  );
  
  // Add sessionId field if missing
  db.sessions.updateMany(
    { sessionId: { \$exists: false } },
    [{
      \$set: {
        sessionId: { \$toString: '\$_id' }
      }
    }]
  );
  
  // Add new indexes
  try {
    db.sessions.createIndex({ sessionId: 1 }, { unique: true });
    db.sessions.createIndex({ isActive: 1 });
    db.sessions.createIndex({ lastActivity: -1 });
    db.sessions.createIndex({ ipAddress: 1 });
    print('✓ Sessions collection migrated with enhanced tracking');
  } catch (error) {
    print('⚠ Some session indexes may already exist: ' + error.message);
  }
}

print('');
print('🆕 Creating new security collections...');

// Create new collections that don't exist
const newCollections = [
  'rate_limits',
  'csrf_tokens', 
  'security_events',
  'performance_metrics',
  'email_queue'
];

newCollections.forEach(function(collectionName) {
  if (!existingCollections.includes(collectionName)) {
    switch(collectionName) {
      case 'rate_limits':
        db.createCollection('rate_limits', {
          validator: {
            \$jsonSchema: {
              bsonType: 'object',
              required: ['identifier', 'count', 'resetTime'],
              properties: {
                identifier: { bsonType: 'string' },
                endpoint: { bsonType: 'string' },
                count: { bsonType: 'int', minimum: 0 },
                resetTime: { bsonType: 'date' },
                createdAt: { bsonType: 'date' }
              }
            }
          }
        });
        db.rate_limits.createIndex({ identifier: 1, endpoint: 1 }, { unique: true });
        db.rate_limits.createIndex({ resetTime: 1 }, { expireAfterSeconds: 0 });
        break;
        
      case 'csrf_tokens':
        db.createCollection('csrf_tokens', {
          validator: {
            \$jsonSchema: {
              bsonType: 'object',
              required: ['token', 'sessionId', 'createdAt', 'expiresAt'],
              properties: {
                token: { bsonType: 'string' },
                sessionId: { bsonType: 'string' },
                used: { bsonType: 'bool', default: false },
                usedAt: { bsonType: 'date' },
                createdAt: { bsonType: 'date' },
                expiresAt: { bsonType: 'date' }
              }
            }
          }
        });
        db.csrf_tokens.createIndex({ token: 1 }, { unique: true });
        db.csrf_tokens.createIndex({ sessionId: 1 });
        db.csrf_tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        break;
        
      case 'security_events':
        db.createCollection('security_events', {
          validator: {
            \$jsonSchema: {
              bsonType: 'object',
              required: ['event', 'severity', 'timestamp'],
              properties: {
                event: { bsonType: 'string' },
                severity: { enum: ['low', 'medium', 'high', 'critical'] },
                category: { enum: ['authentication', 'authorization', 'rate_limit', 'csrf', 'injection', 'other'] },
                userId: { bsonType: 'objectId' },
                sessionId: { bsonType: 'string' },
                ipAddress: { bsonType: 'string' },
                userAgent: { bsonType: 'string' },
                details: { bsonType: 'object' },
                resolved: { bsonType: 'bool', default: false },
                resolvedAt: { bsonType: 'date' },
                resolvedBy: { bsonType: 'objectId' },
                timestamp: { bsonType: 'date' }
              }
            }
          }
        });
        db.security_events.createIndex({ severity: 1, timestamp: -1 });
        db.security_events.createIndex({ category: 1, timestamp: -1 });
        db.security_events.createIndex({ resolved: 1, timestamp: -1 });
        break;
        
      case 'performance_metrics':
        db.createCollection('performance_metrics', {
          validator: {
            \$jsonSchema: {
              bsonType: 'object',
              required: ['metric', 'value', 'timestamp'],
              properties: {
                metric: { bsonType: 'string' },
                value: { bsonType: ['double', 'int'] },
                category: { enum: ['response_time', 'throughput', 'error_rate', 'memory', 'cpu', 'database'] },
                endpoint: { bsonType: 'string' },
                tags: { bsonType: 'object' },
                timestamp: { bsonType: 'date' }
              }
            }
          }
        });
        db.performance_metrics.createIndex({ metric: 1, timestamp: -1 });
        db.performance_metrics.createIndex({ category: 1, timestamp: -1 });
        break;
        
      case 'email_queue':
        db.createCollection('email_queue', {
          validator: {
            \$jsonSchema: {
              bsonType: 'object',
              required: ['to', 'subject', 'template', 'status', 'createdAt'],
              properties: {
                to: { bsonType: 'string' },
                subject: { bsonType: 'string' },
                template: { bsonType: 'string' },
                data: { bsonType: 'object' },
                status: { enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending' },
                attempts: { bsonType: 'int', minimum: 0, default: 0 },
                lastAttempt: { bsonType: 'date' },
                sentAt: { bsonType: 'date' },
                errorMessage: { bsonType: 'string' },
                priority: { enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
                createdAt: { bsonType: 'date' }
              }
            }
          }
        });
        db.email_queue.createIndex({ status: 1, priority: -1, createdAt: 1 });
        break;
    }
    print('✓ Created ' + collectionName + ' collection with validation and indexes');
  } else {
    print('⚠ Collection ' + collectionName + ' already exists, skipping');
  }
});

print('');
print('🔧 Enhancing audit_logs collection...');

// Enhance audit_logs if it exists
if (existingCollections.includes('audit_logs')) {
  // Add new fields to existing audit logs
  db.audit_logs.updateMany(
    {},
    {
      \$set: {
        category: 'system',
        severity: 'low',
        status: 'success'
      }
    }
  );
  
  // Add new indexes
  try {
    db.audit_logs.createIndex({ category: 1, timestamp: -1 });
    db.audit_logs.createIndex({ severity: 1, timestamp: -1 });
    print('✓ Enhanced audit_logs collection');
  } catch (error) {
    print('⚠ Some audit_logs indexes may already exist: ' + error.message);
  }
}

print('');
print('🔧 Enhancing user_preferences collection...');

// Enhance user_preferences if it exists
if (existingCollections.includes('user_preferences')) {
  db.user_preferences.updateMany(
    {},
    {
      \$set: {
        language: 'en',
        timezone: 'UTC',
        'notifications.email': true,
        'notifications.security': true,
        'notifications.system': true,
        'security.sessionTimeout': 3600,
        'security.requireTwoFactor': false,
        'security.allowMultipleSessions': true
      }
    }
  );
  print('✓ Enhanced user_preferences collection');
}

print('');
print('📊 Creating migration summary...');

// Log migration event
try {
  db.security_events.insertOne({
    event: 'database_migration',
    severity: 'medium',
    category: 'other',
    details: {
      message: 'Database migrated to enhanced authentication system',
      version: '2.0',
      migration_date: new Date(),
      collections_migrated: existingCollections,
      new_collections_created: newCollections.filter(name => !existingCollections.includes(name))
    },
    resolved: true,
    resolvedAt: new Date(),
    timestamp: new Date()
  });
  print('✓ Migration event logged');
} catch (error) {
  print('⚠ Could not log migration event: ' + error.message);
}

// Display migration summary
print('');
print('🎉 Database migration completed successfully!');
print('');
print('📊 Migration Summary:');
print('   • Existing collections backed up with suffix: ' + backupSuffix);
print('   • Users collection enhanced with security fields');
print('   • Sessions collection enhanced with activity tracking');
print('   • New security collections created');
print('   • Performance indexes added');
print('');
print('⚠️  Important Post-Migration Steps:');
print('   1. Test all authentication flows');
print('   2. Verify security features are working');
print('   3. Update application configuration if needed');
print('   4. Monitor system performance');
print('   5. Consider removing backup collections after verification');
print('');
print('🔍 To remove backup collections after verification:');
print('   db.listCollectionNames().filter(name => name.includes(\"_backup_\")).forEach(name => db[name].drop())');
print('');
"
