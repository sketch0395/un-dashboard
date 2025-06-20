@echo off
REM Simple SSH-based deployment to 10.5.1.212
REM This creates a deployment package and copies it to the remote server

setlocal enabledelayedexpansion

echo 🚀 UN Dashboard SSH Deployment
echo Target: 10.5.1.212
echo ============================
echo.

set REMOTE_IP=10.5.1.212
set REMOTE_USER=dialtone
set DEPLOY_DIR=un-dashboard-deploy

REM Check if we have the necessary files
if not exist "docker-compose.production.yml" (
    echo ❌ docker-compose.production.yml not found
    exit /b 1
)

REM Create deployment package
echo ℹ️  Creating deployment package...
if exist "%DEPLOY_DIR%" rd /s /q "%DEPLOY_DIR%"
mkdir "%DEPLOY_DIR%"

REM Copy necessary files
copy "docker-compose.production.yml" "%DEPLOY_DIR%\" >nul
copy "un-dashboard\Dockerfile" "%DEPLOY_DIR%\" >nul 2>&1
copy "un-dashboard\Dockerfile.network" "%DEPLOY_DIR%\" >nul 2>&1

REM Copy application files
xcopy "un-dashboard" "%DEPLOY_DIR%\un-dashboard" /E /I /Q >nul 2>&1

REM Copy MongoDB initialization
if exist "mongodb-init" (
    xcopy "mongodb-init" "%DEPLOY_DIR%\mongodb-init" /E /I /Q >nul 2>&1
)

REM Create environment file for remote deployment
echo ℹ️  Creating remote environment configuration...
(
    echo # Production Environment for 10.5.1.212
    echo NODE_ENV=production
    echo.
    echo # Database Configuration
    echo MONGODB_URI=mongodb://admin:un-dashboard-2024@mongodb:27017/undashboard?authSource=admin
    echo REDIS_URL=redis://redis:6379
    echo.
    echo # Security Keys
    echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-%RANDOM%
    echo NEXTAUTH_SECRET=your-nextauth-secret-change-this-%RANDOM%
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
) > "%DEPLOY_DIR%\.env.production"

REM Create deployment script for remote server
echo ℹ️  Creating remote deployment script...
(
    echo #!/bin/bash
    echo # Remote deployment script for UN Dashboard
    echo echo "🚀 Starting UN Dashboard deployment on 10.5.1.212..."
    echo.
    echo # Check if Docker is running
    echo if ! docker info ^> /dev/null 2^>^&1; then
    echo     echo "❌ Docker is not running. Please start Docker and try again."
    echo     exit 1
    echo fi
    echo.
    echo # Check for existing containers and backup if needed
    echo if docker ps -a --format "table {{.Names}}" ^| grep -q "un-dashboard-mongodb"; then
    echo     echo "ℹ️  Found existing MongoDB container, creating backup..."
    echo     mkdir -p backups
    echo     timestamp=$(date +%%Y%%m%%d_%%H%%M%%S^)
    echo     backup_file="backups/mongodb_backup_${timestamp}.archive"
    echo     
    echo     if docker exec un-dashboard-mongodb mongodump --username admin --password un-dashboard-2024 --authenticationDatabase admin --db undashboard --archive=/tmp/backup.archive --gzip; then
    echo         docker cp un-dashboard-mongodb:/tmp/backup.archive "$backup_file"
    echo         docker exec un-dashboard-mongodb rm /tmp/backup.archive
    echo         echo "✅ Backup created: $backup_file"
    echo     else
    echo         echo "⚠️  Backup failed, continuing anyway..."
    echo     fi
    echo fi
    echo.
    echo # Stop existing containers
    echo echo "ℹ️  Stopping existing containers..."
    echo docker-compose -f docker-compose.production.yml -p un-dashboard down
    echo.
    echo # Pull and start new containers
    echo echo "ℹ️  Starting deployment..."
    echo docker-compose -f docker-compose.production.yml -p un-dashboard up -d --build
    echo.
    echo # Wait for services to be ready
    echo echo "ℹ️  Waiting for services to start..."
    echo sleep 30
    echo.
    echo # Show status
    echo echo "📊 Deployment Status:"
    echo docker-compose -f docker-compose.production.yml -p un-dashboard ps
    echo.
    echo echo "✅ Deployment completed!"
    echo echo "🌐 Access your application at: https://10.5.1.212.nip.io"
    echo echo "👤 Admin login: admin / admin123!"
) > "%DEPLOY_DIR%\deploy.sh"

REM Create Windows deployment script for remote server
(
    echo @echo off
    echo REM Remote deployment script for UN Dashboard on Windows
    echo echo 🚀 Starting UN Dashboard deployment on 10.5.1.212...
    echo.
    echo REM Check if Docker is running
    echo docker info ^>nul 2^>^&1
    echo if errorlevel 1 ^(
    echo     echo ❌ Docker is not running. Please start Docker and try again.
    echo     exit /b 1
    echo ^)
    echo.
    echo REM Stop existing containers
    echo echo ℹ️  Stopping existing containers...
    echo docker-compose -f docker-compose.production.yml -p un-dashboard down
    echo.
    echo REM Start new containers
    echo echo ℹ️  Starting deployment...
    echo docker-compose -f docker-compose.production.yml -p un-dashboard up -d --build
    echo.
    echo REM Wait for services
    echo echo ℹ️  Waiting for services to start...
    echo timeout /t 30 /nobreak ^>nul
    echo.
    echo REM Show status
    echo echo 📊 Deployment Status:
    echo docker-compose -f docker-compose.production.yml -p un-dashboard ps
    echo.
    echo echo ✅ Deployment completed!
    echo echo 🌐 Access your application at: https://10.5.1.212.nip.io
    echo echo 👤 Admin login: admin / admin123!
    echo pause
) > "%DEPLOY_DIR%\deploy.bat"

echo ✅ Deployment package created in %DEPLOY_DIR%\

REM Copy to remote server
echo.
echo ℹ️  Copying deployment package to remote server...
echo 💡 You may be prompted for SSH password

scp -r "%DEPLOY_DIR%" %REMOTE_USER%@%REMOTE_IP%:~/
if errorlevel 1 (
    echo ❌ Failed to copy files to remote server
    echo 💡 Please ensure SSH access is working: ssh %REMOTE_USER%@%REMOTE_IP%
    echo.
    echo 🔧 Manual deployment option:
    echo    1. Copy the '%DEPLOY_DIR%' folder to your remote server
    echo    2. SSH to the server: ssh %REMOTE_USER%@%REMOTE_IP%
    echo    3. cd %DEPLOY_DIR%
    echo    4. chmod +x deploy.sh ^&^& ./deploy.sh  ^(Linux^)
    echo    5. Or run: deploy.bat  ^(Windows^)
    pause
    exit /b 1
)

echo ✅ Files copied successfully to remote server

REM Execute deployment on remote server
echo.
echo ℹ️  Executing deployment on remote server...
ssh %REMOTE_USER%@%REMOTE_IP% "cd %DEPLOY_DIR% && chmod +x deploy.sh && ./deploy.sh"

if !errorlevel! equ 0 (
    echo.
    echo ✅ 🎉 Remote deployment completed successfully!
    echo.
    echo 📋 Access Information:
    echo    🌐 Main Application: https://10.5.1.212.nip.io
    echo    🌐 Alternative: http://%REMOTE_IP%:3000
    echo    🗄️  Database Admin: https://db.10.5.1.212.nip.io
    echo    🔧 Traefik Dashboard: http://%REMOTE_IP%:8080
    echo.
    echo 👤 Default Admin Account:
    echo    Username: admin
    echo    Password: admin123!
    echo.
    echo 🔧 Remote Management:
    echo    SSH to server: ssh %REMOTE_USER%@%REMOTE_IP%
    echo    Navigate to: cd %DEPLOY_DIR%
    echo    View logs: docker logs un-dashboard-app
    echo    Restart: docker restart un-dashboard-app
) else (
    echo ❌ Remote deployment failed
    echo 💡 You can manually SSH to the server and run the deployment script:
    echo    ssh %REMOTE_USER%@%REMOTE_IP%
    echo    cd %DEPLOY_DIR%
    echo    ./deploy.sh
)

echo.
pause
