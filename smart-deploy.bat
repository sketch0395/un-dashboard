@echo off
REM Smart Docker Deployment Script for UN Dashboard (Windows)
REM This script checks for existing containers and only creates them if needed

setlocal enabledelayedexpansion

echo 🚀 UN Dashboard Smart Docker Deployment
echo =======================================
echo.

REM Configuration
set COMPOSE_FILE=docker-compose.production.yml
set PROJECT_NAME=un-dashboard
set BACKUP_DIR=.\backups

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo ℹ️  Starting smart deployment process...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Check if docker-compose file exists
if not exist "%COMPOSE_FILE%" (
    echo ❌ Docker Compose file not found: %COMPOSE_FILE%
    exit /b 1
)

REM Function to check container status
echo ℹ️  Checking existing containers...
echo.

REM Check each container
set containers=un-dashboard-traefik un-dashboard-mongodb un-dashboard-redis un-dashboard-app un-dashboard-network un-dashboard-mongo-express
set needs_deployment=false

for %%c in (%containers%) do (
    docker ps -a --format "table {{.Names}}" | findstr /B "%%c" >nul 2>&1
    if !errorlevel! equ 0 (
        docker ps --format "table {{.Names}}" | findstr /B "%%c" >nul 2>&1
        if !errorlevel! equ 0 (
            echo ✅ %%c: Running
        ) else (
            echo ⚠️  %%c: Stopped
            set needs_deployment=true
        )
    ) else (
        echo ℹ️  %%c: Not deployed
        set needs_deployment=true
    )
)

echo.
echo ℹ️  Checking data volumes...
echo.

REM Check volumes
set volumes=un-dashboard_mongodb_data un-dashboard_redis_data un-dashboard_traefik_letsencrypt un-dashboard_app_data

for %%v in (%volumes%) do (
    docker volume ls --format "table {{.Name}}" | findstr /B "%%v" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ %%v: Exists
    ) else (
        echo ℹ️  %%v: Will be created
    )
)

REM Backup MongoDB if running
echo.
docker ps --format "table {{.Names}}" | findstr /B "un-dashboard-mongodb" >nul 2>&1
if !errorlevel! equ 0 (
    echo ℹ️  Creating MongoDB backup before deployment...
    
    set timestamp=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
    set timestamp=%timestamp: =0%
    set backup_file=mongodb_backup_%timestamp%.archive
    
    docker exec un-dashboard-mongodb mongodump --username admin --password un-dashboard-2024 --authenticationDatabase admin --db undashboard --archive=/tmp/!backup_file! --gzip
    if !errorlevel! equ 0 (
        docker cp un-dashboard-mongodb:/tmp/!backup_file! "%BACKUP_DIR%\!backup_file!"
        docker exec un-dashboard-mongodb rm /tmp/!backup_file!
        echo ✅ MongoDB backup created: %BACKUP_DIR%\!backup_file!
    ) else (
        echo ⚠️  MongoDB backup failed, but continuing with deployment
    )
) else (
    echo ℹ️  MongoDB container not running, skipping backup
)

REM Create environment file if it doesn't exist
echo.
if not exist ".env.production" (
    echo ℹ️  Creating production environment file...
    
    REM Generate random values (simplified for Windows)
    set jwt_secret=%RANDOM%%RANDOM%%RANDOM%
    set nextauth_secret=%RANDOM%%RANDOM%%RANDOM%
    
    (
        echo # Production Environment Configuration
        echo NODE_ENV=production
        echo.
        echo # Database Configuration
        echo MONGODB_URI=mongodb://admin:un-dashboard-2024@mongodb:27017/undashboard?authSource=admin
        echo REDIS_URL=redis://redis:6379
        echo.
        echo # Security Keys ^(Generated^)
        echo JWT_SECRET=!jwt_secret!
        echo NEXTAUTH_SECRET=!nextauth_secret!
        echo RANDOM_SECRET=%RANDOM%
        echo.
        echo # Application Configuration
        echo NEXTAUTH_URL=https://yourdomain.com
        echo DEFAULT_IP_RANGE=10.5.1.1-255
        echo DEFAULT_PORTS=21,22,23,25,53,80,110,111,135,139,143,443,993,995,1723,3389,5432,5900,6000,8080
        echo.
        echo # Docker Configuration
        echo USE_DOCKER_NETWORK_TOOLS=true
        echo DOCKER_HOST=unix:///var/run/docker.sock
        echo.
        echo # SSH Configuration
        echo DEFAULT_SSH_USER=dialtone
        echo DEFAULT_SSH_PASSWORD=admin
        echo.
        echo # Collaboration Configuration
        echo COLLABORATION_PORT=4001
        echo.
        echo # Email Configuration ^(Update these^)
        echo SMTP_HOST=smtp.example.com
        echo SMTP_PORT=587
        echo SMTP_USER=noreply@yourdomain.com
        echo SMTP_PASS=your-smtp-password
        echo SMTP_FROM=UN Dashboard ^<noreply@yourdomain.com^>
    ) > .env.production
    
    echo ✅ Environment file created: .env.production
    echo ⚠️  Please update .env.production with your domain and SMTP settings
) else (
    echo ℹ️  Environment file already exists: .env.production
)

REM Deploy containers if needed
echo.
if "%needs_deployment%"=="true" (
    echo ℹ️  Some containers need deployment/restart...
    echo.
    set /p confirm="🤔 Continue with deployment? (y/N): "
    if /i not "!confirm!"=="y" (
        echo ℹ️  Deployment cancelled by user
        exit /b 0
    )
    
    echo ℹ️  Starting Docker Compose deployment...
    
    REM Pull latest images
    echo ℹ️  Pulling latest images...
    docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" pull
    
    REM Build custom images
    echo ℹ️  Building application images...
    docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" build
    
    REM Start services
    echo ℹ️  Starting services...
    docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" up -d
    
    echo ✅ Services started successfully
) else (
    echo ✅ All containers are already running
)

REM Wait for services to be ready
echo.
echo ℹ️  Waiting for services to be ready...
timeout /t 30 /nobreak >nul

REM Show deployment status
echo.
echo ℹ️  Deployment Status:
docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" ps

REM Show completion message
echo.
echo ✅ 🎉 Deployment completed successfully!
echo.
echo 📋 Access Information:
echo    🌐 Main Application: https://yourdomain.com
echo    🗄️  Database Admin: https://db.yourdomain.com
echo    🔧 Traefik Dashboard: http://your-server-ip:8080
echo.
echo 👤 Default Admin Account:
echo    Username: admin
echo    Password: admin123!
echo    Email: admin@example.com
echo.
echo 🔧 Next Steps:
echo    1. Update DNS to point your domain to this server
echo    2. Update .env.production with your actual domain
echo    3. Configure SMTP settings for email notifications
echo    4. Change default admin password after first login
echo    5. Set up regular backups using the backup scripts
echo.

pause
