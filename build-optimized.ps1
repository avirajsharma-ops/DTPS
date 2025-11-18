# Optimized Docker build script with BuildKit and caching for Windows PowerShell
# This script significantly reduces build times by leveraging Docker's advanced caching

Write-Host "🚀 Starting optimized Docker build with BuildKit..." -ForegroundColor Green

# Enable BuildKit for better performance and caching
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

try {
    # Build with cache mounts and multi-platform support
    Write-Host "📦 Building Docker image with cache optimization..." -ForegroundColor Yellow
    
    docker-compose build `
        --build-arg BUILDKIT_INLINE_CACHE=1 `
        --progress=plain `
        app
    
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    
    # Optional: Push to registry for cache sharing (uncomment if you have a registry)
    # Write-Host "📤 Pushing image to registry for cache sharing..." -ForegroundColor Yellow
    # docker-compose push app
    
    Write-Host "🎉 Optimized build process finished!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Tips for even faster builds:" -ForegroundColor Cyan
    Write-Host "   - Use 'docker system prune' to clean up unused cache occasionally"
    Write-Host "   - Consider using a Docker registry for sharing cache between builds"
    Write-Host "   - Use 'docker-compose build --no-cache' only when you need a completely fresh build"
    
} catch {
    Write-Host "❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
