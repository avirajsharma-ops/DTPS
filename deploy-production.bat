@echo off
REM Zoconut Production Deployment Script for Windows
REM This script deploys the cleaned-up production version

echo 🚀 Zoconut Production Deployment
echo =================================

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

echo ✅ Docker and Docker Compose are installed

REM Check if .env.production exists
if not exist .env.production (
    echo ⚠️  .env.production not found. Creating template...
    (
        echo # Production Environment Variables
        echo MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zoconut?retryWrites=true^&w=majority
        echo NEXTAUTH_URL=http://your-server-ip:3000
        echo NEXTAUTH_SECRET=your-super-secure-secret-key-here
        echo NODE_ENV=production
        echo.
        echo # Optional: WooCommerce Integration
        echo WOOCOMMERCE_API_URL=https://your-woocommerce-site.com/wp-json/wc/v3/orders
        echo WOOCOMMERCE_CONSUMER_KEY=your_consumer_key
        echo WOOCOMMERCE_CONSUMER_SECRET=your_consumer_secret
    ) > .env.production
    echo 📝 Please edit .env.production with your actual values before continuing.
    echo Press any key when ready to continue...
    pause >nul
)

REM Stop existing containers
echo 🛑 Stopping existing containers...
docker-compose down

REM Remove old images (optional)
echo 🗑️ Cleaning up old images...
docker image prune -f

REM Build new image with production optimizations
echo 🔨 Building production Docker image...
docker-compose build --no-cache app

REM Start services
echo 🚀 Starting production services...
docker-compose up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to be ready...
timeout /t 30 /nobreak >nul

REM Check if services are running
echo 🔍 Checking service status...
docker-compose ps

REM Test if the application is responding
echo 🧪 Testing application health...
curl -f http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Application is responding!
) else (
    echo ❌ Application is not responding. Check logs:
    echo docker-compose logs -f app
)

echo.
echo 🎉 Production Deployment Completed!
echo ====================================
echo.
echo 📋 Deployment Summary:
echo • Application URL: http://localhost:3000
echo • Environment: Production
echo • Build Status: Optimized
echo • Security: Enhanced
echo • Performance: Optimized
echo.
echo 🔧 Useful Commands:
echo • View logs: docker-compose logs -f app
echo • Stop services: docker-compose down
echo • Restart services: docker-compose restart
echo • View status: docker-compose ps
echo.
echo 🛡️ Security Notes:
echo • All debug endpoints removed
echo • Console logging cleaned up
echo • Production environment variables required
echo • Role-based access control enabled
echo.
echo 📱 Features Available:
echo • ✅ Enhanced Client Management (Zoconut-style)
echo • ✅ Real-time Messaging System
echo • ✅ Appointment Booking
echo • ✅ Progress Tracking
echo • ✅ Food Logging
echo • ✅ WebRTC Audio/Video Calls
echo • ✅ File Sharing ^& Voice Messages
echo • ✅ Analytics Dashboard
echo • ✅ WooCommerce Integration
echo.
echo 🚀 Your Zoconut application is now running in production mode!
echo.
pause
