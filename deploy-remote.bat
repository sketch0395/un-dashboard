@echo off
REM Remote Docker Deployment Script for UN Dashboard
REM Deploys to Docker server at 10.5.1.212

setlocal enabledelayedexpansion

echo 🚀 UN Dashboard Remote Docker Deployment
echo Target: 10.5.1.212
echo ========================================
echo.

REM Configuration
set DOCKER_HOST=tcp://10.5.1.212:2376
set COMPOSE_FILE=docker-compose.production.yml
set PROJECT_NAME=un-dashboard
set BACKUP_DIR=.\backups
set REMOTE_IP=10.5.1.212

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo ℹ️  Deploying to remote Docker server at %REMOTE_IP%...
echo.

REM Test Docker connection to remote server
echo ℹ️  Testing connection to remote Docker server...
docker -H %DOCKER_HOST% info >nul 2>&1
if errorlevel 1 (
    echo ❌ Cannot connect to Docker server at %REMOTE_IP%
    echo 💡 Please ensure:
    echo    1. Docker daemon is running on %REMOTE_IP%
    echo    2. Docker API is exposed on port 2376
    echo    3. Firewall allows connection to port 2376
    echo    4. Or use Docker context/SSH tunnel
    echo.
    echo 🔧 Alternative: Use Docker context
    echo    docker context create remote --docker "host=ssh://user@%REMOTE_IP%"
    echo    docker context use remote
    echo.
    pause
    exit /b 1
)

echo ✅ Connected to remote Docker server at %REMOTE_IP%
echo.

REM Check if docker-compose file exists
if not exist "%COMPOSE_FILE%" (
    echo ❌ Docker Compose file not found: %COMPOSE_FILE%
    exit /b 1
)

REM Function to check container status on remote server
echo ℹ️  Checking existing containers on remote server...
echo.

REM Check each container
set containers=un-dashboard-traefik un-dashboard-mongodb un-dashboard-redis un-dashboard-app un-dashboard-network un-dashboard-mongo-express
set needs_deployment=false

for %%c in (%containers%) do (
    docker -H %DOCKER_HOST% ps -a --format "table {{.Names}}" | findstr /B "%%c" >nul 2>&1
    if !errorlevel! equ 0 (
        docker -H %DOCKER_HOST% ps --format "table {{.Names}}" | findstr /B "%%c" >nul 2>&1
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
echo ℹ️  Checking data volumes on remote server...
echo.

REM Check volumes
set volumes=un-dashboard_mongodb_data un-dashboard_redis_data un-dashboard_traefik_letsencrypt un-dashboard_app_data

for %%v in (%volumes%) do (
    docker -H %DOCKER_HOST% volume ls --format "table {{.Name}}" | findstr /B "%%v" >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ %%v: Exists on remote server
    ) else (
        echo ℹ️  %%v: Will be created on remote server
    )
)

REM Backup MongoDB if running on remote server
echo.
docker -H %DOCKER_HOST% ps --format "table {{.Names}}" | findstr /B "un-dashboard-mongodb" >nul 2>&1
if !errorlevel! equ 0 (
    echo ℹ️  Creating MongoDB backup from remote server...
    
    set timestamp=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
    set timestamp=%timestamp: =0%
    set backup_file=mongodb_backup_%timestamp%.archive
    
    docker -H %DOCKER_HOST% exec un-dashboard-mongodb mongodump --username admin --password un-dashboard-2024 --authenticationDatabase admin --db undashboard --archive=/tmp/!backup_file! --gzip
    if !errorlevel! equ 0 (
        docker -H %DOCKER_HOST% cp un-dashboard-mongodb:/tmp/!backup_file! "%BACKUP_DIR%\!backup_file!"
        docker -H %DOCKER_HOST% exec un-dashboard-mongodb rm /tmp/!backup_file!
        echo ✅ MongoDB backup created: %BACKUP_DIR%\!backup_file!
    ) else (
        echo ⚠️  MongoDB backup failed, but continuing with deployment
    )
) else (
    echo ℹ️  MongoDB container not running on remote server, skipping backup
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
        echo NEXTAUTH_URL=https://10.5.1.212.nip.io
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
        echo SMTP_USER=noreply@10.5.1.212.nip.io
        echo SMTP_PASS=your-smtp-password
        echo SMTP_FROM=UN Dashboard ^<noreply@10.5.1.212.nip.io^>
    ) > .env.production
    
    echo ✅ Environment file created: .env.production
) else (
    echo ℹ️  Environment file already exists: .env.production
)

REM Deploy containers to remote server
echo.
if "%needs_deployment%"=="true" (
    echo ℹ️  Some containers need deployment/restart on remote server...
    echo.
    set /p confirm="🤔 Continue with remote deployment to %REMOTE_IP%? (y/N): "
    if /i not "!confirm!"=="y" (
        echo ℹ️  Deployment cancelled by user
        exit /b 0
    )
    
    echo ℹ️  Starting remote Docker Compose deployment...
    
    REM Pull latest images on remote server
    echo ℹ️  Pulling latest images on remote server...
    docker-compose -H %DOCKER_HOST% -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" pull
    
    REM Build custom images on remote server
    echo ℹ️  Building application images on remote server...
    docker-compose -H %DOCKER_HOST% -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" build
    
    REM Start services on remote server
    echo ℹ️  Starting services on remote server...
    docker-compose -H %DOCKER_HOST% -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" up -d
    
    echo ✅ Services started successfully on remote server
) else (
    echo ✅ All containers are already running on remote server
)

REM Wait for services to be ready
echo.
echo ℹ️  Waiting for services to be ready on remote server...
timeout /t 30 /nobreak >nul

REM Show deployment status
echo.
echo ℹ️  Remote Deployment Status:
docker-compose -H %DOCKER_HOST% -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" ps

REM Test connectivity
echo.
echo ℹ️  Testing connectivity to deployed services...
echo.

REM Test if services are responding
curl -f -s http://%REMOTE_IP%:8080/api/overview >nul 2>&1
if !errorlevel! equ 0 (
    echo ✅ Traefik dashboard accessible at http://%REMOTE_IP%:8080
) else (
    echo ⚠️  Traefik dashboard may not be ready yet
)

REM Show completion message
echo.
echo ✅ 🎉 Remote deployment completed successfully!
echo.
echo 📋 Access Information:
echo    🌐 Main Application: https://10.5.1.212.nip.io
echo    🗄️  Database Admin: https://db.10.5.1.212.nip.io
echo    🔧 Traefik Dashboard: http://%REMOTE_IP%:8080
echo    📊 Direct Network Server: http://%REMOTE_IP%:4000
echo.
echo 👤 Default Admin Account:
echo    Username: admin
echo    Password: admin123!
echo    Email: admin@example.com
echo.
echo 🔧 Next Steps:
echo    1. Test access from external networks
echo    2. Change default admin password after first login
echo    3. Configure firewall rules on %REMOTE_IP% if needed
echo    4. Set up regular backups using the backup scripts
echo.
echo 🌐 Network Access:
echo    - Internal network: http://%REMOTE_IP%:3000 ^(direct app^)
echo    - External access: https://10.5.1.212.nip.io ^(via proxy^)
echo    - Database UI: https://db.10.5.1.212.nip.io
echo.

pause
