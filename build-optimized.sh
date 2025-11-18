#!/bin/bash

# Optimized Docker build script with BuildKit and caching
# This script significantly reduces build times by leveraging Docker's advanced caching

set -e

echo "🚀 Starting optimized Docker build with BuildKit..."

# Enable BuildKit for better performance and caching
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build with cache mounts and multi-platform support
echo "📦 Building Docker image with cache optimization..."

docker-compose build \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  --progress=plain \
  app

echo "✅ Build completed successfully!"

# Optional: Push to registry for cache sharing (uncomment if you have a registry)
# echo "📤 Pushing image to registry for cache sharing..."
# docker-compose push app

echo "🎉 Optimized build process finished!"
echo ""
echo "💡 Tips for even faster builds:"
echo "   - Use 'docker system prune' to clean up unused cache occasionally"
echo "   - Consider using a Docker registry for sharing cache between builds"
echo "   - Use 'docker-compose build --no-cache' only when you need a completely fresh build"
