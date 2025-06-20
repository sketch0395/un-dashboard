# UN Dashboard Security Implementation Guide

## Overview

This document provides comprehensive information about the security implementation of the UN Dashboard authentication system, including setup, configuration, and best practices.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Security Features](#security-features)
3. [Setup and Configuration](#setup-and-configuration)
4. [API Security](#api-security)
5. [Monitoring and Logging](#monitoring-and-logging)
6. [Deployment Guidelines](#deployment-guidelines)
7. [Troubleshooting](#troubleshooting)

## Architecture Overview

The UN Dashboard implements a multi-layered security architecture:

```
┌─────────────────────────────────────────────┐
│                 Client Layer                │
├─────────────────────────────────────────────┤
│        Security Headers & CSRF Protection  │
├─────────────────────────────────────────────┤
│              Rate Limiting Layer            │
├─────────────────────────────────────────────┤
│            Authentication Layer             │
├─────────────────────────────────────────────┤
│               Application Layer             │
├─────────────────────────────────────────────┤
│               Database Layer                │
└─────────────────────────────────────────────┘
```

## Security Features

### 1. Authentication & Authorization
- **JWT-based authentication** with secure token generation
- **Role-based access control** (RBAC)
- **Session management** with automatic cleanup
- **Password hashing** using bcrypt with salt rounds

### 2. Protection Mechanisms
- **CSRF Protection** with token-based validation
- **Rate Limiting** to prevent brute force attacks
- **Security Headers** for XSS, clickjacking, and content type protection
- **Input validation** and sanitization

### 3. Monitoring & Auditing
- **Comprehensive audit logging** for all security events
- **Failed login attempt tracking**
- **Session monitoring** and cleanup
- **Email notifications** for security events

### 4. Performance Optimization
- **Query optimization** with caching
- **Batch processing** for cleanup operations
- **Database indexing** recommendations
- **Memory-efficient session management**

## Setup and Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Core Configuration
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret-key-here
MONGODB_URI=mongodb://localhost:27017/un-dashboard

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=5    # Max requests per window

# Session Configuration
SESSION_CLEANUP_INTERVAL=60  # Minutes between cleanup runs
SESSION_MAX_IDLE_HOURS=24    # Hours before session expires

# Email Configuration (choose one provider)
# Gmail Configuration
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# SMTP Configuration
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-smtp-password

# Admin Notifications
ADMIN_NOTIFICATION_EMAILS=admin1@domain.com,admin2@domain.com

# Security Configuration
CSRF_TOKEN_EXPIRY=3600000    # 1 hour in milliseconds
AUDIT_LOG_RETENTION_DAYS=90  # Days to keep audit logs
```

### Email Configuration Examples

Copy `.env.email.example` to `.env` and configure your email provider:

#### Gmail Setup
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use the app password in EMAIL_PASSWORD

#### SMTP Setup
Configure your SMTP provider settings in the environment variables.

### Database Setup

Ensure MongoDB is running and accessible. The system will automatically create necessary collections and indexes.

## API Security

### Authentication Endpoints

All authentication endpoints are protected with multiple security layers:

#### POST /api/auth/login
- **Rate Limiting:** 5 attempts per 15 minutes
- **CSRF Protection:** Required
- **Security Headers:** Applied
- **Audit Logging:** Failed/successful attempts
- **Email Notifications:** Failed login alerts

#### POST /api/auth/register  
- **Rate Limiting:** 3 attempts per hour
- **CSRF Protection:** Required
- **Input Validation:** Username, email, password strength
- **Audit Logging:** Registration attempts

#### POST /api/auth/logout
- **CSRF Protection:** Required
- **Session Cleanup:** Automatic
- **Email Notifications:** Session termination alerts

#### POST /api/user/change-password
- **Rate Limiting:** 3 attempts per hour
- **CSRF Protection:** Single-use tokens
- **Password Validation:** Strength requirements
- **Email Notifications:** Password change alerts

### Security Headers Applied

```javascript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': 'default-src \'self\'; ...',
  'Referrer-Policy': 'no-referrer'
}
```

### CSRF Protection

CSRF tokens are required for all state-changing operations:

1. **Get CSRF Token:** `GET /api/csrf-token`
2. **Include in Requests:** `X-CSRF-Token` header
3. **Token Validation:** Server-side verification
4. **Single-use Tokens:** For sensitive operations

## Monitoring and Logging

### Audit Events Tracked

- User authentication (login/logout)
- Password changes
- Failed login attempts
- Session terminations
- Admin actions
- System errors

### Performance Monitoring

Access admin performance dashboard: `/api/admin/performance`

- Cache statistics
- Session metrics
- Audit log analytics
- Database performance

### Session Management

Automatic cleanup service runs every 60 minutes (production) / 30 minutes (development):

- Removes expired sessions
- Cleans inactive sessions (24+ hours)
- Batch processing for performance
- Configurable cleanup criteria

## Deployment Guidelines

### Production Checklist

#### Environment Setup
- [ ] Set `NODE_ENV=production`
- [ ] Configure strong JWT secret (32+ characters)
- [ ] Set up secure database connection
- [ ] Configure email notifications
- [ ] Set admin notification emails

#### Security Configuration
- [ ] Enable HTTPS/TLS
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set up firewall rules
- [ ] Enable database authentication
- [ ] Configure log rotation

#### Monitoring Setup
- [ ] Set up application monitoring
- [ ] Configure log aggregation
- [ ] Set up alerting for security events
- [ ] Monitor performance metrics

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Common Issues

#### 1. CSRF Token Errors
**Problem:** `Invalid CSRF token` errors
**Solution:** 
- Ensure session cookies are properly set
- Check token expiration settings
- Verify CSRF token in request headers

#### 2. Rate Limiting Issues
**Problem:** Users getting rate-limited unexpectedly
**Solution:**
- Check rate limit configuration
- Review IP address detection
- Consider implementing user-based rate limiting

#### 3. Email Notification Failures
**Problem:** Security emails not being sent
**Solution:**
- Verify email provider configuration
- Check authentication credentials
- Review email service logs

#### 4. Session Cleanup Issues
**Problem:** Sessions not being cleaned up
**Solution:**
- Check cleanup service status
- Verify database connectivity
- Review cleanup configuration

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=auth:*,session:*,csrf:*
```

### Log Analysis

Check application logs for:
- Authentication failures
- Rate limiting triggers
- CSRF protection events
- Session cleanup activities
- Email notification status

### Performance Issues

If experiencing performance problems:
1. Check database indexes: `GET /api/admin/performance`
2. Review cache statistics
3. Monitor session cleanup frequency
4. Analyze audit log retention

## Security Best Practices

### For Developers

1. **Always validate input** on both client and server side
2. **Use parameterized queries** to prevent injection attacks
3. **Implement proper error handling** without exposing sensitive information
4. **Keep dependencies updated** regularly
5. **Follow principle of least privilege** for user permissions

### For Administrators

1. **Regularly review audit logs** for suspicious activity
2. **Monitor failed login attempts** and implement account lockout if necessary
3. **Keep email notifications enabled** for security events
4. **Regularly backup database** and test restore procedures
5. **Update system dependencies** and security patches

### For Users

1. **Use strong passwords** with mixed characters, numbers, and symbols
2. **Log out properly** when finished using the system
3. **Report suspicious activity** immediately
4. **Keep browser updated** for latest security features
5. **Don't share login credentials** with others

## Support and Maintenance

### Regular Maintenance Tasks

#### Daily
- Review security alerts
- Check system logs for errors
- Monitor performance metrics

#### Weekly
- Review failed login reports
- Check email notification delivery
- Analyze session usage patterns

#### Monthly
- Update dependencies
- Review and rotate secrets
- Analyze audit log trends
- Performance optimization review

### Getting Help

For support with the UN Dashboard authentication system:

1. Check this documentation first
2. Review application logs
3. Check the troubleshooting section
4. Contact the development team with specific error messages and logs

---

**Last Updated:** [Current Date]
**Version:** 1.0
**Author:** UN Dashboard Security Team
