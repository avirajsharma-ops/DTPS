#!/bin/bash

# Complete deployment script for Ubuntu Digital Ocean server
# This script handles the entire deployment process with optimizations

set -e

echo "🚀 Starting optimized deployment on Ubuntu server..."

# Enable BuildKit for better performance
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "📦 Building optimized Docker image..."
docker-compose build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --progress=plain \
  app

echo "🛑 Stopping existing containers..."
docker-compose down

echo "🚀 Starting optimized application..."
docker-compose up -d

echo "⏳ Waiting for application to start..."
sleep 10

echo "🔍 Checking application health..."
docker-compose ps

echo "📊 Application logs (last 20 lines):"
docker-compose logs --tail=20 app

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 Your application should be running at:"
echo "   - HTTP: http://your-server-ip:3000"
echo "   - HTTPS: https://your-domain.com (if configured)"
echo ""
echo "📝 Useful commands:"
echo "   - View logs: docker-compose logs -f app"
echo "   - Check status: docker-compose ps"
echo "   - Restart: docker-compose restart app"
echo "   - Stop: docker-compose down"
