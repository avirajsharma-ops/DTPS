# Zoconut Application Deployment Script for Windows PowerShell
# This script builds and deploys the Zoconut application using Docker

param(
    [switch]$CleanImages = $false,
    [switch]$Help = $false
)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Show help
if ($Help) {
    Write-Host "Zoconut Deployment Script" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\deploy.ps1 [options]" -ForegroundColor White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor White
    Write-Host "  -CleanImages    Remove old Docker images before deployment" -ForegroundColor Gray
    Write-Host "  -Help          Show this help message" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor White
    Write-Host "  .\deploy.ps1                 # Standard deployment" -ForegroundColor Gray
    Write-Host "  .\deploy.ps1 -CleanImages    # Clean deployment" -ForegroundColor Gray
    exit 0
}

Write-Host "🚀 Starting Zoconut Deployment..." -ForegroundColor Cyan

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Status "Docker is installed"
} catch {
    Write-Error "Docker is not installed. Please install Docker Desktop first."
    exit 1
}

# Check if Docker Compose is available
try {
    docker-compose --version | Out-Null
    Write-Status "Docker Compose is available"
} catch {
    Write-Error "Docker Compose is not available. Please install Docker Compose."
    exit 1
}

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Warning ".env.local file not found."
    if (Test-Path ".env.production") {
        Copy-Item ".env.production" ".env.local"
        Write-Warning "Created .env.local from template. Please update with your production values before continuing."
        Write-Host "Press any key to continue after updating .env.local..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } else {
        Write-Error "No environment template found. Please create .env.local file."
        exit 1
    }
}

# Stop existing containers
Write-Status "Stopping existing containers..."
try {
    docker-compose down --remove-orphans
    Write-Success "Containers stopped successfully"
} catch {
    Write-Warning "No existing containers to stop"
}

# Clean old images if requested
if ($CleanImages) {
    Write-Status "Cleaning old Docker images..."
    try {
        docker system prune -f
        docker image prune -f
        Write-Success "Old images cleaned"
    } catch {
        Write-Warning "Failed to clean some images"
    }
}

# Build and start containers
Write-Status "Building and starting containers..."
try {
    docker-compose up --build -d
    Write-Success "Containers built and started"
} catch {
    Write-Error "Failed to build and start containers"
    Write-Status "Checking logs..."
    docker-compose logs
    exit 1
}

# Wait for services to be ready
Write-Status "Waiting for services to be ready..."
Start-Sleep -Seconds 15

# Check if containers are running
$runningContainers = docker-compose ps --filter "status=running" --quiet
if ($runningContainers) {
    Write-Success "Deployment completed successfully!"
    Write-Status "Application is running at: http://localhost:3000"
    
    # Show container status
    Write-Host ""
    Write-Status "Container Status:"
    docker-compose ps
    
    # Show recent logs
    Write-Host ""
    Write-Status "Recent logs:"
    docker-compose logs --tail=20
    
} else {
    Write-Error "Deployment failed. Checking logs..."
    docker-compose logs
    exit 1
}

Write-Host ""
Write-Success "🎉 Zoconut application deployed successfully!" -ForegroundColor Green
Write-Status "You can view logs with: docker-compose logs -f"
Write-Status "To stop the application: docker-compose down"
Write-Status "To restart: docker-compose restart"

# Optional: Open browser
$openBrowser = Read-Host "Do you want to open the application in your browser? (y/N)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    Start-Process "http://localhost:3000"
}
