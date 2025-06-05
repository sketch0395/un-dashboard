# UN Dashboard MongoDB Initialization

This directory contains MongoDB initialization scripts for the UN Dashboard enhanced authentication system.

## Scripts Overview

### 1. `init-db-enhanced.js` - Fresh Installation
Complete database initialization script for new deployments with all enhanced security features.

**Features:**
- Enhanced user collection with security fields
- Session management with activity tracking
- Rate limiting support
- CSRF protection tokens
- Comprehensive audit logging
- Performance metrics collection
- Security event monitoring
- Email notification queue
- Advanced user preferences

### 2. `migrate-database.js` - Migration Script
Database migration script for upgrading existing UN Dashboard installations.

**Features:**
- Backs up existing collections
- Migrates existing data to new schema
- Adds new security collections
- Preserves existing user data
- Creates necessary indexes

### 3. `DATABASE_SCHEMA.md` - Documentation
Comprehensive documentation of the enhanced database schema.

## Usage

### Fresh Installation

For new UN Dashboard deployments:

```bash
# Make script executable
chmod +x init-db-enhanced.js

# Run initialization
./init-db-enhanced.js
```

### Migration from Existing Installation

For upgrading existing UN Dashboard installations:

```bash
# Make script executable
chmod +x migrate-database.js

# Run migration (creates backups automatically)
./migrate-database.js
```

### Verification

After running either script, verify the installation:

```bash
mongosh --eval "
db = db.getSiblingDB('un_dashboard');
print('Collections created:');
db.listCollectionNames().forEach(name => print('  • ' + name));
print('');
print('Sample user count: ' + db.users.countDocuments());
print('Indexes created: ' + db.users.getIndexes().length + ' on users collection');
"
```

## Security Configuration

### Default Admin User

Both scripts create a default admin user:
- **Username:** `admin`
- **Email:** `admin@un-dashboard.local`
- **Password:** Must be set via application (placeholder hash created)

**⚠️ Important:** The admin password must be set through the application before production use!

### Database User

Scripts create a MongoDB user for the application:
- **Username:** `un_app`
- **Password:** `un_app_password_2024`
- **Permissions:** Read/Write access to `un_dashboard` database

**🔒 Security Note:** Change the default password in production!

## Collections Created

### Core Collections
- **users** - User accounts with enhanced security fields
- **sessions** - Session management with activity tracking
- **user_preferences** - Enhanced user settings and preferences

### Security Collections
- **rate_limits** - API rate limiting data
- **csrf_tokens** - CSRF protection tokens
- **audit_logs** - Comprehensive audit trail
- **security_events** - Security incident tracking

### System Collections
- **performance_metrics** - System performance monitoring
- **email_queue** - Email notification system

## Performance Optimizations

### Indexing Strategy
- Strategic compound indexes for authentication flows
- TTL indexes for automatic cleanup
- Sparse indexes for optional fields

### Automatic Cleanup
- Session expiration handling
- Rate limit record cleanup
- CSRF token expiration
- Performance metric retention

## Post-Installation Steps

### 1. Application Configuration

Update your application's database configuration:

```javascript
// Database connection
const MONGODB_URI = 'mongodb://un_app:un_app_password_2024@localhost:27017/un_dashboard';

// Enable all security features
const SECURITY_CONFIG = {
  csrfProtection: true,
  rateLimiting: true,
  sessionTracking: true,
  auditLogging: true,
  emailNotifications: true
};
```

### 2. Set Admin Password

Use the application to set the admin password:

```bash
# Through the application API or admin interface
curl -X POST http://localhost:3000/api/auth/set-admin-password \
  -H "Content-Type: application/json" \
  -d '{"password": "your-secure-admin-password"}'
```

### 3. Test Authentication Flow

Verify all components are working:

1. User registration
2. User login
3. Session management
4. CSRF protection
5. Rate limiting
6. Audit logging

### 4. Monitor Security Events

Check the security events collection:

```bash
mongosh --eval "
db = db.getSiblingDB('un_dashboard');
db.security_events.find().sort({timestamp: -1}).limit(5).pretty();
"
```

## Troubleshooting

### Common Issues

#### 1. Permission Errors
```bash
# Ensure MongoDB service is running
sudo systemctl status mongod

# Check database permissions
mongosh --eval "db.runCommand({connectionStatus: 1})"
```

#### 2. Index Creation Failures
```bash
# Check existing indexes
mongosh --eval "
db = db.getSiblingDB('un_dashboard');
db.users.getIndexes().forEach(idx => print(JSON.stringify(idx, null, 2)));
"
```

#### 3. Validation Errors
```bash
# Check schema validation
mongosh --eval "
db = db.getSiblingDB('un_dashboard');
db.runCommand({listCollections: 1, filter: {name: 'users'}});
"
```

### Performance Issues

#### 1. Slow Queries
```bash
# Enable profiling
mongosh --eval "
db = db.getSiblingDB('un_dashboard');
db.setProfilingLevel(2, {slowms: 100});
"

# Check slow operations
mongosh --eval "
db = db.getSiblingDB('un_dashboard');
db.system.profile.find().sort({ts: -1}).limit(5).pretty();
"
```

#### 2. Index Usage
```bash
# Analyze query performance
mongosh --eval "
db = db.getSiblingDB('un_dashboard');
db.users.find({username: 'admin'}).explain('executionStats');
"
```

## Maintenance

### Regular Tasks

#### 1. Monitor Collection Sizes
```bash
mongosh --eval "
db = db.getSiblingDB('un_dashboard');
db.stats();
"
```

#### 2. Clean Up Old Data
```bash
# Remove old audit logs (older than 90 days)
mongosh --eval "
db = db.getSiblingDB('un_dashboard');
const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
db.audit_logs.deleteMany({timestamp: {\$lt: cutoff}});
"
```

#### 3. Backup Database
```bash
# Create backup
mongodump --db un_dashboard --out ./backup-$(date +%Y%m%d)

# Restore from backup
mongorestore --db un_dashboard ./backup-20241201/un_dashboard/
```

### Performance Monitoring

Monitor key metrics:
- Authentication response times
- Session cleanup efficiency
- Rate limiting effectiveness
- Security event frequency

## Security Best Practices

1. **Change default passwords** immediately
2. **Enable SSL/TLS** for MongoDB connections
3. **Regularly audit security events**
4. **Monitor performance metrics**
5. **Keep audit logs** for compliance
6. **Backup database regularly**
7. **Test disaster recovery procedures**

## Support

For issues with the initialization scripts:

1. Check the MongoDB logs for errors
2. Verify network connectivity
3. Ensure proper permissions
4. Review the troubleshooting section
5. Check the main project documentation

---

**Note:** These scripts are designed for the UN Dashboard Enhanced Authentication System v2.0. Ensure compatibility with your application version.
