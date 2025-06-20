#!/bin/bash

# UN Dashboard MongoDB Initialization with Admin User
echo "Starting UN Dashboard MongoDB initialization..."

# Initialize database
mongosh --eval "
// Switch to the application database
db = db.getSiblingDB('undashboard');

// Create application user if not exists
try {
  db.createUser({
    user: 'un_app',
    pwd: 'un_app_password_2024',
    roles: [
      { role: 'readWrite', db: 'undashboard' }
    ]
  });
  print('✅ Application user created successfully');
} catch (e) {
  if (e.code === 11000) {
    print('ℹ️  Application user already exists');
  } else {
    print('❌ Error creating application user:', e.message);
  }
}

// Create collections with validation
print('📋 Creating collections...');

// Users collection
try {
  db.createCollection('users', {
    validator: {
      \$jsonSchema: {
        bsonType: 'object',
        required: ['username', 'email', 'password', 'firstName', 'lastName', 'role'],
        properties: {
          username: {
            bsonType: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: '^[a-zA-Z0-9_-]+\$'
          },
          email: {
            bsonType: 'string',
            pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}\$'
          },
          password: {
            bsonType: 'string',
            minLength: 8
          },
          role: {
            enum: ['admin', 'user', 'viewer']
          },
          isActive: {
            bsonType: 'bool'
          }
        }
      }
    }
  });
  print('✅ Users collection created');
} catch (e) {
  print('ℹ️  Users collection already exists');
}

// Create indexes for users
try {
  db.users.createIndex({ username: 1 }, { unique: true });
  db.users.createIndex({ email: 1 }, { unique: true });
  db.users.createIndex({ role: 1 });
  db.users.createIndex({ isActive: 1 });
  print('✅ User indexes created');
} catch (e) {
  print('ℹ️  User indexes already exist');
}

// Sessions collection
try {
  db.createCollection('sessions');
  db.sessions.createIndex({ sessionId: 1 }, { unique: true });
  db.sessions.createIndex({ userId: 1 });
  db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  print('✅ Sessions collection created');
} catch (e) {
  print('ℹ️  Sessions collection already exists');
}

// Shared scans collection
try {
  db.createCollection('sharedscans');
  db.sharedscans.createIndex({ name: 1 });
  db.sharedscans.createIndex({ createdBy: 1 });
  db.sharedscans.createIndex({ isPublic: 1 });
  print('✅ SharedScans collection created');
} catch (e) {
  print('ℹ️  SharedScans collection already exists');
}

// Audit logs collection
try {
  db.createCollection('auditlogs');
  db.auditlogs.createIndex({ userId: 1 });
  db.auditlogs.createIndex({ action: 1 });
  db.auditlogs.createIndex({ timestamp: 1 });
  print('✅ AuditLogs collection created');
} catch (e) {
  print('ℹ️  AuditLogs collection already exists');
}

// Check if admin user already exists
const existingAdmin = db.users.findOne({ username: 'admin' });

if (!existingAdmin) {
  print('👤 Creating default admin user...');
  
  // Create bcrypt hash for 'admin123!' password
  // This is pre-computed bcrypt hash with salt rounds = 12
  const adminPasswordHash = '\$2b\$12\$rQJ0CvGKVlE9pVKdBvbzaOyKoJ6hFzNxYlCNzY0QrMxJ8NXFwYjfC';
  
  const adminUser = {
    username: 'admin',
    email: 'admin@undashboard.local',
    password: adminPasswordHash,
    firstName: 'System',
    lastName: 'Administrator', 
    role: 'admin',
    department: 'IT Administration',
    isActive: true,
    approvedAt: new Date(),
    approvedBy: null,
    lastLogin: null,
    loginAttempts: 0,
    lockUntil: null,
    preferences: {
      theme: 'auto',
      notifications: {
        email: true,
        push: true
      },
      dashboard: {
        refreshInterval: 30000,
        defaultView: 'overview'
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  try {
    const result = db.users.insertOne(adminUser);
    print('✅ Default admin user created successfully');
    print('📋 Admin credentials:');
    print('   Username: admin');
    print('   Password: admin123!');
    print('   Email: admin@undashboard.local');
    print('   Role: admin');
  } catch (e) {
    print('❌ Error creating admin user:', e.message);
  }
} else {
  print('ℹ️  Admin user already exists');
  print('👤 Current admin details:');
  print('   Username:', existingAdmin.username);
  print('   Email:', existingAdmin.email);
  print('   Role:', existingAdmin.role);
  print('   Active:', existingAdmin.isActive);
}

print('🎉 MongoDB initialization completed!');
"
