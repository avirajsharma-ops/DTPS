#!/bin/bash

# Zoconut SSL Deployment Script
# This script deploys the application with SSL certificate support

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Zoconut SSL Deployment${NC}"
echo -e "${BLUE}=========================${NC}"

# Check if running as root (required for SSL certificate access)
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root to access SSL certificates${NC}"
    echo -e "${YELLOW}Please run: sudo ./deploy-ssl.sh${NC}"
    exit 1
fi

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

# Check if SSL certificates exist
if [ ! -f "/etc/letsencrypt/live/dtps.tech/fullchain.pem" ]; then
    echo -e "${RED}❌ SSL certificate not found at /etc/letsencrypt/live/dtps.tech/fullchain.pem${NC}"
    echo -e "${YELLOW}Please run: sudo certbot certonly --standalone -d dtps.tech${NC}"
    exit 1
fi

if [ ! -f "/etc/letsencrypt/live/dtps.tech/privkey.pem" ]; then
    echo -e "${RED}❌ SSL private key not found at /etc/letsencrypt/live/dtps.tech/privkey.pem${NC}"
    echo -e "${YELLOW}Please run: sudo certbot certonly --standalone -d dtps.tech${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SSL certificates found for dtps.tech${NC}"

# Check certificate expiry
CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/dtps.tech/fullchain.pem | cut -d= -f2)
echo -e "${BLUE}📅 Certificate expires: ${CERT_EXPIRY}${NC}"

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down || true

# Remove old images
echo -e "${YELLOW}🗑️ Cleaning up old images...${NC}"
docker image prune -f || true

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull origin main || echo -e "${YELLOW}⚠️ Git pull failed or not in a git repository${NC}"

# Build new image with SSL support
echo -e "${YELLOW}🔨 Building Docker image with SSL support...${NC}"
docker-compose build --no-cache app

# Start services with SSL
echo -e "${YELLOW}🚀 Starting services with SSL...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check if services are running
echo -e "${YELLOW}🔍 Checking service status...${NC}"
docker-compose ps

# Test HTTP redirect
echo -e "${YELLOW}🧪 Testing HTTP to HTTPS redirect...${NC}"
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://dtps.tech || echo "000")
if [ "$HTTP_RESPONSE" = "301" ] || [ "$HTTP_RESPONSE" = "302" ]; then
    echo -e "${GREEN}✅ HTTP to HTTPS redirect working!${NC}"
else
    echo -e "${YELLOW}⚠️ HTTP redirect response: $HTTP_RESPONSE${NC}"
fi

# Test HTTPS
echo -e "${YELLOW}🧪 Testing HTTPS connection...${NC}"
if curl -f -k https://dtps.tech > /dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS is working!${NC}"
else
    echo -e "${RED}❌ HTTPS connection failed. Check logs:${NC}"
    echo -e "${YELLOW}docker-compose logs -f nginx${NC}"
fi

# Test SSL certificate
echo -e "${YELLOW}🧪 Testing SSL certificate...${NC}"
SSL_CHECK=$(echo | openssl s_client -servername dtps.tech -connect dtps.tech:443 2>/dev/null | openssl x509 -noout -issuer)
if [[ $SSL_CHECK == *"Let's Encrypt"* ]]; then
    echo -e "${GREEN}✅ Let's Encrypt SSL certificate is active!${NC}"
else
    echo -e "${YELLOW}⚠️ SSL certificate check: $SSL_CHECK${NC}"
fi

echo ""
echo -e "${GREEN}🎉 SSL Deployment Completed!${NC}"
echo -e "${GREEN}===========================${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "• Application URL: ${GREEN}https://dtps.tech${NC}"
echo -e "• HTTP Redirect: ${GREEN}Enabled${NC}"
echo -e "• SSL Certificate: ${GREEN}Let's Encrypt${NC}"
echo -e "• Security Headers: ${GREEN}Enhanced${NC}"
echo -e "• HSTS: ${GREEN}Enabled${NC}"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo -e "• View logs: ${YELLOW}docker-compose logs -f${NC}"
echo -e "• View nginx logs: ${YELLOW}docker-compose logs -f nginx${NC}"
echo -e "• Stop services: ${YELLOW}docker-compose down${NC}"
echo -e "• Restart services: ${YELLOW}docker-compose restart${NC}"
echo -e "• Check SSL: ${YELLOW}openssl s_client -servername dtps.tech -connect dtps.tech:443${NC}"
echo ""
echo -e "${BLUE}🔄 Certificate Renewal:${NC}"
echo -e "• Auto-renewal is configured by certbot"
echo -e "• Manual renewal: ${YELLOW}sudo certbot renew${NC}"
echo -e "• After renewal: ${YELLOW}docker-compose restart nginx${NC}"
echo ""
echo -e "${GREEN}🔒 Your Zoconut application is now running with SSL encryption!${NC}"
echo -e "${GREEN}Visit: https://dtps.tech${NC}"
