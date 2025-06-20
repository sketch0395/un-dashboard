# UN Dashboard Docker Deployment Guide

## 🚀 Quick Start

This guide will help you deploy UN Dashboard with reverse proxy for external access.

### Prerequisites

- Docker and Docker Compose installed
- Domain name pointing to your server
- Ports 80 and 443 open on your server

### 1. Initial Setup

```bash
# Clone or copy your UN Dashboard files to the server
cd /path/to/un-dashboard

# Make the deployment script executable (Linux/Mac)
chmod +x smart-deploy.sh

# Run the smart deployment script
./smart-deploy.sh

# On Windows, use:
smart-deploy.bat
```

### 2. Configuration

#### Update Domain Settings

Edit `.env.production` and replace `yourdomain.com` with your actual domain:

```env
NEXTAUTH_URL=https://yourdomain.com
```

#### Update Docker Compose Labels

Edit `docker-compose.production.yml` and replace `yourdomain.com` with your domain:

```yaml
# Main application
- "traefik.http.routers.un-dashboard.rule=Host(`yourdomain.com`)"

# Database admin (optional)
- "traefik.http.routers.mongo-express.rule=Host(`db.yourdomain.com`)"

# Traefik dashboard (optional)
- "traefik.http.routers.traefik.rule=Host(`traefik.yourdomain.com`)"
```

#### Update SSL Email

In `docker-compose.production.yml`, update the Let's Encrypt email:

```yaml
- "--certificatesresolvers.letsencrypt.acme.email=your-email@yourdomain.com"
```

### 3. DNS Configuration

Point your domain to your server's IP address:

```
A    yourdomain.com        -> YOUR_SERVER_IP
A    db.yourdomain.com     -> YOUR_SERVER_IP
A    traefik.yourdomain.com -> YOUR_SERVER_IP
```

### 4. Restart Services

After configuration changes:

```bash
docker-compose -f docker-compose.production.yml -p un-dashboard restart
```

## 📋 Access Information

Once deployed, you can access:

- **Main Application**: https://yourdomain.com
- **Database Admin**: https://db.yourdomain.com
- **Traefik Dashboard**: http://your-server-ip:8080

## 👤 Default Admin Account

```
Username: admin
Password: admin123!
Email: admin@example.com
```

**⚠️ IMPORTANT**: Change the admin password immediately after first login!

## 🔧 Container Management

### Check Status
```bash
docker-compose -f docker-compose.production.yml -p un-dashboard ps
```

### View Logs
```bash
docker-compose -f docker-compose.production.yml -p un-dashboard logs -f [service-name]
```

### Stop All Services
```bash
docker-compose -f docker-compose.production.yml -p un-dashboard down
```

### Start All Services
```bash
docker-compose -f docker-compose.production.yml -p un-dashboard up -d
```

## 🔒 Security Best Practices

### 1. Change Default Passwords

- Admin user password
- MongoDB passwords (if exposing externally)
- Traefik dashboard access

### 2. Firewall Configuration

Only expose necessary ports:
- 80 (HTTP - redirects to HTTPS)
- 443 (HTTPS)
- 22 (SSH for server management)

### 3. SSL Certificates

Traefik automatically handles SSL certificates via Let's Encrypt. Ensure:
- Your domain correctly points to the server
- Ports 80 and 443 are accessible
- The email in the configuration is valid

### 4. Environment Variables

Keep sensitive environment variables secure:
- Generate strong JWT secrets
- Use strong database passwords
- Don't commit `.env.production` to version control

## 🔄 Backup and Recovery

### Create Backup
```bash
# Create MongoDB backup
./backup-mongodb.bat  # Windows
./backup-mongodb.sh   # Linux/Mac
```

### Restore Backup
```bash
# Restore from backup
./restore-mongodb.bat backup-file.archive  # Windows
./restore-mongodb.sh backup-file.archive   # Linux/Mac
```

### Automated Backups

Set up a cron job (Linux/Mac) or scheduled task (Windows) to run backups regularly:

```bash
# Add to crontab for daily backups at 2 AM
0 2 * * * /path/to/un-dashboard/backup-mongodb.sh
```

## 🚨 Troubleshooting

### Container Issues

1. **Check container status**:
   ```bash
   docker ps -a
   ```

2. **View container logs**:
   ```bash
   docker logs un-dashboard-app
   ```

3. **Restart problematic container**:
   ```bash
   docker restart un-dashboard-app
   ```

### SSL Certificate Issues

1. **Check Traefik logs**:
   ```bash
   docker logs un-dashboard-traefik
   ```

2. **Verify domain resolution**:
   ```bash
   nslookup yourdomain.com
   ```

3. **Check firewall**:
   ```bash
   telnet yourdomain.com 80
   telnet yourdomain.com 443
   ```

### Database Connection Issues

1. **Check MongoDB logs**:
   ```bash
   docker logs un-dashboard-mongodb
   ```

2. **Test database connection**:
   ```bash
   docker exec -it un-dashboard-mongodb mongosh
   ```

### Application Issues

1. **Check application logs**:
   ```bash
   docker logs un-dashboard-app
   ```

2. **Test health endpoint**:
   ```bash
   curl https://yourdomain.com/api/health
   ```

## 📞 Support

If you encounter issues:

1. Check the logs for error messages
2. Verify all configuration files are correct
3. Ensure your domain DNS is properly configured
4. Check that required ports are open

## 🔄 Updates

To update the application:

1. Pull latest code/images
2. Run the smart deployment script again
3. It will automatically backup data and update containers

```bash
./smart-deploy.sh
```

The smart deployment script will:
- ✅ Check existing containers
- ✅ Backup data before changes
- ✅ Only recreate containers that need updates
- ✅ Preserve data volumes
- ✅ Ensure admin user exists
