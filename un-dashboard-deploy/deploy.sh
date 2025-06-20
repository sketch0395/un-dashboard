#/bin/bash
# Remote deployment script for UN Dashboard
echo "🚀 Starting UN Dashboard deployment on 10.5.1.212..."

# Check if Docker is running
if  docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check for existing containers and backup if needed
if docker ps -a --format "table {{.Names}}" | grep -q "un-dashboard-mongodb"; then
    echo "ℹ️  Found existing MongoDB container, creating backup..."
    mkdir -p backups
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_file="backups/mongodb_backup_${timestamp}.archive"
ECHO is off.
    if docker exec un-dashboard-mongodb mongodump --username admin --password un-dashboard-2024 --authenticationDatabase admin --db undashboard --archive=/tmp/backup.archive --gzip; then
        docker cp un-dashboard-mongodb:/tmp/backup.archive "$backup_file"
        docker exec un-dashboard-mongodb rm /tmp/backup.archive
        echo "✅ Backup created: $backup_file"
    else
        echo "⚠️  Backup failed, continuing anyway..."
    fi
fi

# Stop existing containers
echo "ℹ️  Stopping existing containers..."
docker-compose -f docker-compose.production.yml -p un-dashboard down

# Pull and start new containers
echo "ℹ️  Starting deployment..."
docker-compose -f docker-compose.production.yml -p un-dashboard up -d --build

# Wait for services to be ready
echo "ℹ️  Waiting for services to start..."
sleep 30

# Show status
echo "📊 Deployment Status:"
docker-compose -f docker-compose.production.yml -p un-dashboard ps

echo "✅ Deployment completed"
echo "🌐 Access your application at: https://10.5.1.212.nip.io"
echo "👤 Admin login: admin / admin123"
