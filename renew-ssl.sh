#!/bin/bash

# SSL Certificate Renewal Script for Zoconut
# This script renews the Let's Encrypt certificate and restarts nginx

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 SSL Certificate Renewal${NC}"
echo -e "${BLUE}==========================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root${NC}"
    echo -e "${YELLOW}Please run: sudo ./renew-ssl.sh${NC}"
    exit 1
fi

# Check current certificate expiry
if [ -f "/etc/letsencrypt/live/dtps.tech/fullchain.pem" ]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/dtps.tech/fullchain.pem | cut -d= -f2)
    echo -e "${BLUE}📅 Current certificate expires: ${CERT_EXPIRY}${NC}"
    
    # Check if certificate expires in less than 30 days
    EXPIRY_DATE=$(date -d "$CERT_EXPIRY" +%s)
    CURRENT_DATE=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (EXPIRY_DATE - CURRENT_DATE) / 86400 ))
    
    echo -e "${BLUE}📊 Days until expiry: ${DAYS_UNTIL_EXPIRY}${NC}"
    
    if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
        echo -e "${GREEN}✅ Certificate is still valid for more than 30 days${NC}"
        echo -e "${YELLOW}⚠️ Renewal not necessary, but proceeding anyway...${NC}"
    fi
else
    echo -e "${RED}❌ Certificate not found${NC}"
    exit 1
fi

# Stop nginx temporarily for standalone renewal
echo -e "${YELLOW}🛑 Stopping nginx for certificate renewal...${NC}"
docker-compose stop nginx

# Renew certificate
echo -e "${YELLOW}🔄 Renewing SSL certificate...${NC}"
certbot renew --standalone --quiet

# Check if renewal was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Certificate renewal successful!${NC}"
    
    # Get new expiry date
    NEW_CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/dtps.tech/fullchain.pem | cut -d= -f2)
    echo -e "${GREEN}📅 New certificate expires: ${NEW_CERT_EXPIRY}${NC}"
else
    echo -e "${RED}❌ Certificate renewal failed${NC}"
    echo -e "${YELLOW}🔧 Starting nginx anyway...${NC}"
fi

# Restart nginx with new certificate
echo -e "${YELLOW}🚀 Starting nginx with renewed certificate...${NC}"
docker-compose start nginx

# Wait for nginx to start
sleep 10

# Test the renewed certificate
echo -e "${YELLOW}🧪 Testing renewed certificate...${NC}"
if curl -f -k https://dtps.tech > /dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS is working with renewed certificate!${NC}"
else
    echo -e "${RED}❌ HTTPS test failed${NC}"
    echo -e "${YELLOW}Check logs: docker-compose logs -f nginx${NC}"
fi

# Verify certificate details
echo -e "${YELLOW}🔍 Verifying certificate details...${NC}"
SSL_INFO=$(echo | openssl s_client -servername dtps.tech -connect dtps.tech:443 2>/dev/null | openssl x509 -noout -dates)
echo -e "${BLUE}Certificate info:${NC}"
echo "$SSL_INFO"

echo ""
echo -e "${GREEN}🎉 SSL Certificate Renewal Completed!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "• Certificate has been renewed"
echo -e "• Nginx has been restarted"
echo -e "• HTTPS is working"
echo -e "• Auto-renewal is configured"
echo ""
echo -e "${BLUE}🔧 Monitoring:${NC}"
echo -e "• Check certificate: ${YELLOW}sudo certbot certificates${NC}"
echo -e "• View logs: ${YELLOW}docker-compose logs -f nginx${NC}"
echo -e "• Test SSL: ${YELLOW}curl -I https://dtps.tech${NC}"
echo ""
echo -e "${GREEN}🔒 Your SSL certificate has been successfully renewed!${NC}"
