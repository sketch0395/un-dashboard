// UN Dashboard MongoDB Initialization with Admin User
// This script runs automatically when MongoDB container starts

print('🚀 Starting UN Dashboard MongoDB initialization...');

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
      $jsonSchema: {
        bsonType: 'object',
        required: ['username', 'email', 'password', 'firstName', 'lastName', 'role'],
        properties: {
          username: {
            bsonType: 'string',
            minLength: 3,
            maxLength: 50
          },
          email: {
            bsonType: 'string'
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

// Other collections
try {
  db.createCollection('sessions');
  db.sessions.createIndex({ sessionId: 1 }, { unique: true });
  db.sessions.createIndex({ userId: 1 });
  db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  
  db.createCollection('sharedscans');
  db.sharedscans.createIndex({ name: 1 });
  db.sharedscans.createIndex({ createdBy: 1 });
  
  db.createCollection('auditlogs');
  db.auditlogs.createIndex({ userId: 1 });
  db.auditlogs.createIndex({ timestamp: 1 });
  
  print('✅ All collections and indexes created');
} catch (e) {
  print('ℹ️  Collections already exist');
}

// Check if admin user already exists
const existingAdmin = db.users.findOne({ username: 'admin' });

if (!existingAdmin) {
  print('👤 Creating default admin user...');
  
  // Create admin user document
  // Note: The password will be hashed by the application when first used
  const adminUser = {
    username: 'admin',
    email: 'admin@example.com',
    password: '$2b$12$rQJ0CvGKVlE9pVKdBvbzaOZwJ9pGKU7Y1jRlN5xL8Hg.KvF2vwJte', // pre-hashed 'admin123!'
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
    passwordResetToken: null,
    passwordResetExpires: null,
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
    print('   Email: admin@example.com');
    print('   Role: admin');
    print('   Status: Active');
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

// Create sample data or configurations if needed
print('🔧 Setting up application configurations...');

try {
  db.createCollection('configurations');
  
  // Insert default app configuration
  db.configurations.replaceOne(
    { type: 'app' },
    {
      type: 'app',
      version: '1.0.0',
      initialized: true,
      initializedAt: new Date(),
      features: {
        collaboration: true,
        networkScanning: true,
        userManagement: true,
        auditLogging: true
      },
      settings: {
        maxLoginAttempts: 5,
        sessionTimeout: 86400000, // 24 hours
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false
        }
      },
      updatedAt: new Date()
    },
    { upsert: true }
  );
  
  print('✅ Application configuration created');
} catch (e) {
  print('❌ Error creating configuration:', e.message);
}

print('🎉 UN Dashboard MongoDB initialization completed successfully!');
print('🚀 Application is ready to start!');
