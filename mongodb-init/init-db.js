#!/bin/bash

# UN Dashboard MongoDB Initialization Script
# Enhanced for comprehensive authentication system with security features
# This script sets up the database, collections, indexes, and default admin user

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

// Create collections with validation
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
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        password: {
          bsonType: 'string',
          minLength: 6
        },
        role: {
          enum: ['admin', 'user', 'viewer'],
          default: 'user'
        },
        isActive: {
          bsonType: 'bool',
          default: true
        },
        lastLogin: {
          bsonType: 'date'
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

db.createCollection('sessions', {
  validator: {
    \$jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'token', 'createdAt', 'expiresAt'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        token: {
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

db.createCollection('audit_logs', {
  validator: {
    \$jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'action', 'timestamp'],
      properties: {
        userId: {
          bsonType: 'objectId'
        },
        action: {
          bsonType: 'string'
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
        timestamp: {
          bsonType: 'date'
        }
      }
    }
  }
});

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
          enum: ['dark', 'light'],
          default: 'dark'
        },
        dashboardLayout: {
          bsonType: 'object'
        },
        notifications: {
          bsonType: 'object'
        },
        updatedAt: {
          bsonType: 'date'
        }
      }
    }
  }
});

// Create indexes
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.sessions.createIndex({ token: 1 }, { unique: true });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.audit_logs.createIndex({ userId: 1, timestamp: -1 });
db.user_preferences.createIndex({ userId: 1 }, { unique: true });

// Insert default admin user
const bcrypt = require('bcrypt');
const saltRounds = 12;

// Note: In production, you should hash the password properly
// For now, we'll insert a placeholder that needs to be updated
db.users.insertOne({
  username: 'admin',
  email: 'admin@un-dashboard.local',
  password: 'PLACEHOLDER_HASH', // This will be updated by the application
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialization complete!');
"
