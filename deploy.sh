#!/bin/bash

# Zoconut Docker Deployment Script for DigitalOcean Droplet

set -e

echo "🚀 Starting Zoconut deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="zoconut"
DOCKER_IMAGE="zoconut-app"
CONTAINER_NAME="zoconut-container"
PORT=3000
DOMAIN=${1:-"your-domain.com"}

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo "App Name: $APP_NAME"
echo "Docker Image: $DOCKER_IMAGE"
echo "Container Name: $CONTAINER_NAME"
echo "Port: $PORT"
echo "Domain: $DOMAIN"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down || true

# Remove old images (optional)
echo -e "${YELLOW}🗑️ Cleaning up old images...${NC}"
docker image prune -f || true

# Build new image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker-compose build --no-cache

# Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check if services are running
echo -e "${YELLOW}🔍 Checking service status...${NC}"
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Services are running successfully!${NC}"
else
    echo -e "${RED}❌ Some services failed to start. Check logs:${NC}"
    docker-compose logs
    exit 1
fi

# Display running containers
echo -e "${GREEN}📊 Running containers:${NC}"
docker-compose ps

# Display logs
echo -e "${YELLOW}📝 Recent logs:${NC}"
docker-compose logs --tail=20

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your application should be available at:${NC}"
echo -e "${GREEN}   - HTTP: http://$DOMAIN${NC}"
echo -e "${GREEN}   - Direct: http://$(curl -s ifconfig.me):$PORT${NC}"
echo ""
echo -e "${YELLOW}📋 Useful commands:${NC}"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart services: docker-compose restart"
echo "  Update application: ./deploy.sh"
echo ""
echo -e "${GREEN}✨ Happy coding!${NC}"
