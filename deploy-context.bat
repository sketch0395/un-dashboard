@echo off
REM Docker Context Deployment for UN Dashboard
REM Uses Docker context to securely connect to remote Docker server

setlocal enabledelayedexpansion

echo 🚀 UN Dashboard Docker Context Deployment
echo Target: 10.5.1.212 (via SSH)
echo =========================================
echo.

REM Configuration
set REMOTE_IP=10.5.1.212
set REMOTE_USER=dialtone
set COMPOSE_FILE=docker-compose.production.yml
set PROJECT_NAME=un-dashboard
set CONTEXT_NAME=undashboard-remote

echo ℹ️  Setting up Docker context for remote deployment...

REM Create or use existing Docker context
docker context ls | findstr "%CONTEXT_NAME%" >nul 2>&1
if errorlevel 1 (
    echo ℹ️  Creating new Docker context...
    echo 💡 You may be prompted for SSH password for user '%REMOTE_USER%'
    docker context create %CONTEXT_NAME% --docker "host=ssh://%REMOTE_USER%@%REMOTE_IP%"
    if errorlevel 1 (
        echo ❌ Failed to create Docker context
        echo 💡 Please ensure:
        echo    1. SSH access to %REMOTE_USER%@%REMOTE_IP% is working
        echo    2. Docker is installed on the remote server
        echo    3. User '%REMOTE_USER%' can access Docker ^(in docker group^)
        echo.
        echo 🔧 Test SSH manually: ssh %REMOTE_USER%@%REMOTE_IP%
        pause
        exit /b 1
    )
    echo ✅ Docker context created successfully
) else (
    echo ✅ Docker context '%CONTEXT_NAME%' already exists
)

REM Switch to remote context
echo ℹ️  Switching to remote Docker context...
docker context use %CONTEXT_NAME%
if errorlevel 1 (
    echo ❌ Failed to switch to remote context
    exit /b 1
)

REM Test connection
echo ℹ️  Testing remote Docker connection...
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Cannot connect to remote Docker server
    echo 💡 Switching back to default context
    docker context use default
    exit /b 1
)

echo ✅ Connected to remote Docker server at %REMOTE_IP%

REM Copy files to remote server (if needed)
echo ℹ️  Ensuring deployment files are on remote server...

REM Create a deployment package
if not exist "deployment-package" mkdir deployment-package
copy "%COMPOSE_FILE%" deployment-package\ >nul
copy ".env.production" deployment-package\ >nul 2>&1
copy "mongodb-init\*.js" deployment-package\ >nul 2>&1

REM Copy to remote server
echo ℹ️  Copying files to remote server...
scp -r deployment-package %REMOTE_USER%@%REMOTE_IP%:~/un-dashboard-deploy/
if errorlevel 1 (
    echo ⚠️  Failed to copy files via SCP, using Docker copy instead...
    REM Alternative: Create a temporary container to copy files
    echo ℹ️  Files will be built directly from current directory
)

REM Check existing containers
echo.
echo ℹ️  Checking existing containers on remote server...
set needs_deployment=false

REM List of containers to check
set containers=un-dashboard-traefik un-dashboard-mongodb un-dashboard-redis un-dashboard-app un-dashboard-network

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

REM Deploy or start containers
echo.
if "%needs_deployment%"=="true" (
    echo ℹ️  Starting deployment to remote server...
    
    REM Create necessary directories on remote server
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock alpine sh -c "mkdir -p /tmp/un-dashboard-init"
    
    REM Deploy using docker-compose
    echo ℹ️  Running docker-compose on remote server...
    docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" up -d --build
    
    if !errorlevel! equ 0 (
        echo ✅ Deployment successful!
    ) else (
        echo ❌ Deployment failed
        docker context use default
        exit /b 1
    )
) else (
    echo ✅ All containers already running
    echo ℹ️  Ensuring containers are started...
    docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" start
)

REM Wait for services
echo.
echo ℹ️  Waiting for services to be ready...
timeout /t 30 /nobreak >nul

REM Show status
echo.
echo ℹ️  Deployment Status:
docker-compose -f "%COMPOSE_FILE%" -p "%PROJECT_NAME%" ps

REM Switch back to default context
echo.
echo ℹ️  Switching back to default Docker context...
docker context use default

REM Show success message
echo.
echo ✅ 🎉 Remote deployment completed successfully!
echo.
echo 📋 Access Information:
echo    🌐 Main Application: https://10.5.1.212.nip.io
echo    🌐 Alternative Access: http://%REMOTE_IP%:3000 ^(direct^)
echo    🗄️  Database Admin: https://db.10.5.1.212.nip.io  
echo    🔧 Traefik Dashboard: http://%REMOTE_IP%:8080
echo.
echo 👤 Default Admin Account:
echo    Username: admin
echo    Password: admin123!
echo    Email: admin@example.com
echo.
echo 🔧 Remote Management:
echo    To manage remote containers later:
echo    1. docker context use %CONTEXT_NAME%
echo    2. Run your docker commands
echo    3. docker context use default ^(to switch back^)
echo.
echo 💡 Quick Commands:
echo    View logs: docker context use %CONTEXT_NAME% ^&^& docker logs un-dashboard-app
echo    Restart:   docker context use %CONTEXT_NAME% ^&^& docker restart un-dashboard-app
echo    Status:    docker context use %CONTEXT_NAME% ^&^& docker ps
echo.

REM Clean up
if exist "deployment-package" rd /s /q deployment-package

pause
