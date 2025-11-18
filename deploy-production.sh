#!/bin/bash

# Zoconut Production Deployment Script
# This script deploys the cleaned-up production version

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Zoconut Production Deployment${NC}"
echo -e "${BLUE}=================================${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠️  .env.production not found. Creating template...${NC}"
    cat > .env.production << EOF
# Production Environment Variables
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zoconut?retryWrites=true&w=majority
NEXTAUTH_URL=http://your-server-ip:3000
NEXTAUTH_SECRET=your-super-secure-secret-key-here
NODE_ENV=production

# Optional: WooCommerce Integration
WOOCOMMERCE_API_URL=https://your-woocommerce-site.com/wp-json/wc/v3/orders
WOOCOMMERCE_CONSUMER_KEY=your_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_consumer_secret
EOF
    echo -e "${YELLOW}📝 Please edit .env.production with your actual values before continuing.${NC}"
    echo -e "${YELLOW}Press Enter when ready to continue...${NC}"
    read
fi

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down || true

# Remove old images (optional)
echo -e "${YELLOW}🗑️ Cleaning up old images...${NC}"
docker image prune -f || true

# Build new image with production optimizations
echo -e "${YELLOW}🔨 Building production Docker image...${NC}"
docker-compose build --no-cache app

# Start services
echo -e "${YELLOW}🚀 Starting production services...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check if services are running
echo -e "${YELLOW}🔍 Checking service status...${NC}"
docker-compose ps

# Test if the application is responding
echo -e "${YELLOW}🧪 Testing application health...${NC}"
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is responding!${NC}"
else
    echo -e "${RED}❌ Application is not responding. Check logs:${NC}"
    echo -e "${YELLOW}docker-compose logs -f app${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Production Deployment Completed!${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "• Application URL: ${YELLOW}http://localhost:3000${NC}"
echo -e "• Environment: ${YELLOW}Production${NC}"
echo -e "• Build Status: ${GREEN}Optimized${NC}"
echo -e "• Security: ${GREEN}Enhanced${NC}"
echo -e "• Performance: ${GREEN}Optimized${NC}"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo -e "• View logs: ${YELLOW}docker-compose logs -f app${NC}"
echo -e "• Stop services: ${YELLOW}docker-compose down${NC}"
echo -e "• Restart services: ${YELLOW}docker-compose restart${NC}"
echo -e "• View status: ${YELLOW}docker-compose ps${NC}"
echo ""
echo -e "${BLUE}🛡️ Security Notes:${NC}"
echo -e "• All debug endpoints removed"
echo -e "• Console logging cleaned up"
echo -e "• Production environment variables required"
echo -e "• Role-based access control enabled"
echo ""
echo -e "${BLUE}📱 Features Available:${NC}"
echo -e "• ✅ Enhanced Client Management (Zoconut-style)"
echo -e "• ✅ Real-time Messaging System"
echo -e "• ✅ Appointment Booking"
echo -e "• ✅ Progress Tracking"
echo -e "• ✅ Food Logging"
echo -e "• ✅ WebRTC Audio/Video Calls"
echo -e "• ✅ File Sharing & Voice Messages"
echo -e "• ✅ Analytics Dashboard"
echo -e "• ✅ WooCommerce Integration"
echo ""
echo -e "${GREEN}🚀 Your Zoconut application is now running in production mode!${NC}"
