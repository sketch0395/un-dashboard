@echo off
REM Remote deployment script for UN Dashboard on Windows
echo 🚀 Starting UN Dashboard deployment on 10.5.1.212...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Stop existing containers
echo ℹ️  Stopping existing containers...
docker-compose -f docker-compose.production.yml -p un-dashboard down

REM Start new containers
echo ℹ️  Starting deployment...
docker-compose -f docker-compose.production.yml -p un-dashboard up -d --build

REM Wait for services
echo ℹ️  Waiting for services to start...
timeout /t 30 /nobreak >nul

REM Show status
echo 📊 Deployment Status:
docker-compose -f docker-compose.production.yml -p un-dashboard ps

echo ✅ Deployment completed
echo 🌐 Access your application at: https://10.5.1.212.nip.io
echo 👤 Admin login: admin / admin123
pause
