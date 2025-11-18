#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 DTPS Nutrition - Downloadable App Builder\n');

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  appName: 'DTPS Nutrition',
  deployedUrl: 'https://dtps.tech/', // ⚠️ REPLACE WITH YOUR ACTUAL DEPLOYED URL
  version: '1.0.0',
  description: 'Your personal nutrition and wellness platform',
  outputDir: 'downloadable-apps'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function createDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`✅ Created directory: ${dir}`, 'green');
  }
}

function updateDeployedUrl() {
  log('⚙️  Updating configuration files...', 'blue');
  
  // Update all script files with the deployed URL
  const filesToUpdate = [
    'scripts/build-desktop-app.js',
    'scripts/create-pwa-packages.js'
  ];
  
  filesToUpdate.forEach(file => {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      content = content.replace(/https:\/\/your-deployed-app-url\.com/g, CONFIG.deployedUrl);
      fs.writeFileSync(file, content);
      log(`  Updated: ${file}`, 'cyan');
    }
  });
}

function createPWAPackages() {
  log('📱 Creating PWA installation packages...', 'blue');
  
  try {
    execSync('node scripts/create-pwa-packages.js', { stdio: 'inherit' });
    log('✅ PWA packages created successfully', 'green');
  } catch (error) {
    log('❌ Failed to create PWA packages: ' + error.message, 'red');
  }
}

function createDesktopApp() {
  log('💻 Creating desktop application...', 'blue');
  
  try {
    // Check if Node.js and npm are available
    execSync('node --version', { stdio: 'pipe' });
    execSync('npm --version', { stdio: 'pipe' });
    
    execSync('node scripts/build-desktop-app.js', { stdio: 'inherit' });
    log('✅ Desktop application created successfully', 'green');
  } catch (error) {
    log('⚠️  Desktop app creation skipped (requires Node.js and npm)', 'yellow');
    log('   You can run it manually later with: node scripts/build-desktop-app.js', 'yellow');
  }
}

function createQuickInstaller() {
  log('🌐 Creating quick installer page...', 'blue');
  
  const installerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Install ${CONFIG.appName}</title>
    <link rel="manifest" href="${CONFIG.deployedUrl}/manifest.json">
    <meta name="theme-color" content="#16a34a">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: linear-gradient(135deg, #16a34a 0%, #059669 100%); 
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 20px;
        }
        .container { 
            background: white; 
            border-radius: 24px; 
            padding: 40px; 
            max-width: 500px; 
            width: 100%; 
            box-shadow: 0 25px 50px rgba(0,0,0,0.15); 
            text-align: center; 
        }
        .logo { 
            width: 100px; 
            height: 100px; 
            background: linear-gradient(135deg, #16a34a, #059669); 
            border-radius: 24px; 
            margin: 0 auto 24px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: white; 
            font-size: 36px; 
            font-weight: bold; 
            box-shadow: 0 10px 20px rgba(22, 163, 74, 0.3);
        }
        h1 { color: #1f2937; margin-bottom: 8px; font-size: 28px; }
        .subtitle { color: #6b7280; margin-bottom: 32px; font-size: 16px; }
        .install-btn { 
            display: block; 
            width: 100%; 
            padding: 16px 24px; 
            margin: 12px 0; 
            border: none; 
            border-radius: 16px; 
            font-size: 16px; 
            font-weight: 600; 
            cursor: pointer; 
            transition: all 0.3s ease; 
            text-decoration: none; 
            color: white; 
            position: relative;
            overflow: hidden;
        }
        .install-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
        .primary { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
        .secondary { background: linear-gradient(135deg, #10b981, #059669); }
        .tertiary { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .features { 
            background: #f8fafc; 
            border-radius: 16px; 
            padding: 24px; 
            margin-top: 32px; 
            text-align: left; 
        }
        .feature { 
            display: flex; 
            align-items: center; 
            margin: 12px 0; 
            color: #4b5563; 
            font-size: 14px;
        }
        .feature::before { 
            content: '✅'; 
            margin-right: 12px; 
            font-size: 16px;
        }
        .url-display {
            background: #f1f5f9;
            padding: 12px;
            border-radius: 8px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
            color: #475569;
            word-break: break-all;
        }
        @media (max-width: 480px) {
            .container { padding: 24px; }
            h1 { font-size: 24px; }
            .logo { width: 80px; height: 80px; font-size: 28px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">DN</div>
        <h1>${CONFIG.appName}</h1>
        <p class="subtitle">${CONFIG.description}</p>
        
        <a href="${CONFIG.deployedUrl}" class="install-btn primary" target="_blank" id="openApp">
            🚀 Open & Install App
        </a>
        
        <button class="install-btn secondary" id="installPWA" style="display: none;">
            📱 Install App
        </button>
        
        <a href="pwa-packages/index.html" class="install-btn tertiary">
            📦 View All Installation Options
        </a>
        
        <div class="url-display">
            App URL: ${CONFIG.deployedUrl}
        </div>
        
        <div class="features">
            <h3 style="margin-bottom: 16px; color: #1f2937;">App Features</h3>
            <div class="feature">Works offline without internet</div>
            <div class="feature">Push notifications for updates</div>
            <div class="feature">Native app experience</div>
            <div class="feature">Automatic updates</div>
            <div class="feature">Cross-platform compatibility</div>
            <div class="feature">Secure authentication</div>
        </div>
    </div>
    
    <script>
        // PWA Installation Logic
        let deferredPrompt;
        const installButton = document.getElementById('installPWA');
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installButton.style.display = 'block';
        });
        
        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('User choice:', outcome);
                deferredPrompt = null;
                installButton.style.display = 'none';
            }
        });
        
        // Platform detection
        const userAgent = navigator.userAgent.toLowerCase();
        const platform = userAgent.includes('android') ? 'Android' : 
                        userAgent.includes('iphone') || userAgent.includes('ipad') ? 'iOS' : 
                        userAgent.includes('windows') ? 'Windows' : 
                        userAgent.includes('mac') ? 'macOS' : 'Desktop';
        
        console.log('Detected platform:', platform);
        
        // Update button text based on platform
        const openAppBtn = document.getElementById('openApp');
        if (platform === 'iOS') {
            openAppBtn.innerHTML = '🍎 Open in Safari & Install';
        } else if (platform === 'Android') {
            openAppBtn.innerHTML = '🤖 Open in Chrome & Install';
        }
    </script>
</body>
</html>
`;

  fs.writeFileSync(path.join(CONFIG.outputDir, 'install.html'), installerHtml);
  log('✅ Quick installer page created', 'green');
}

function createInstructions() {
  log('📝 Creating installation instructions...', 'blue');
  
  const instructions = `
# ${CONFIG.appName} - Installation Guide

## Quick Installation
1. Open \`install.html\` in a web browser
2. Click "Open & Install App" 
3. Follow the browser prompts to install

## Available Packages

### 📱 Mobile Apps (PWA)
- **Android**: Install via Chrome browser or download APK
- **iOS**: Install via Safari browser
- **Features**: Offline support, push notifications, native feel

### 💻 Desktop Apps
- **Windows**: .exe installer and portable version
- **macOS**: .dmg installer
- **Linux**: AppImage, .deb, and .rpm packages
- **Features**: Native desktop integration, system notifications

### 🌐 Web App
- **URL**: ${CONFIG.deployedUrl}
- **Features**: Works in any modern browser, responsive design

## Installation Methods

### Method 1: PWA Installation (Recommended)
1. Visit: ${CONFIG.deployedUrl}
2. Look for browser install prompt
3. Click "Install" or "Add to Home Screen"
4. App will be installed with native features

### Method 2: Platform-Specific Packages
1. Open \`pwa-packages/index.html\`
2. Choose your platform
3. Follow platform-specific instructions

### Method 3: Desktop Application
1. Check \`desktop-builds/\` folder for native apps
2. Download appropriate installer for your OS
3. Run installer and follow setup wizard

## Features
- ✅ Offline functionality
- ✅ Push notifications  
- ✅ Native app experience
- ✅ Cross-platform compatibility
- ✅ Automatic updates
- ✅ Secure authentication

## Support
- App URL: ${CONFIG.deployedUrl}
- Version: ${CONFIG.version}
- Built: ${new Date().toISOString().split('T')[0]}

## Technical Requirements
- **Mobile**: iOS 11.3+ or Android 5.0+
- **Desktop**: Windows 10+, macOS 10.14+, or modern Linux
- **Browser**: Chrome 67+, Safari 11.1+, Firefox 58+, Edge 79+
`;

  fs.writeFileSync(path.join(CONFIG.outputDir, 'INSTALLATION.md'), instructions);
  log('✅ Installation instructions created', 'green');
}

function validateConfiguration() {
  log('🔍 Validating configuration...', 'blue');
  
  if (CONFIG.deployedUrl === 'https://your-deployed-app-url.com') {
    log('⚠️  WARNING: Please update the deployedUrl in the CONFIG section!', 'yellow');
    log('   Current URL: ' + CONFIG.deployedUrl, 'yellow');
    log('   This should be your actual deployed application URL', 'yellow');
    return false;
  }
  
  log('✅ Configuration looks good', 'green');
  return true;
}

function main() {
  log('🎯 Starting downloadable app creation process...', 'bright');
  log(`App: ${CONFIG.appName} v${CONFIG.version}`, 'cyan');
  log(`URL: ${CONFIG.deployedUrl}`, 'cyan');
  log('');
  
  // Validate configuration
  const isValid = validateConfiguration();
  if (!isValid) {
    log('❌ Please fix configuration issues before continuing', 'red');
    return;
  }
  
  // Create main output directory
  createDirectory(CONFIG.outputDir);
  
  // Update configuration in scripts
  updateDeployedUrl();
  
  // Create different types of packages
  createPWAPackages();
  createDesktopApp();
  createQuickInstaller();
  createInstructions();
  
  log('', 'reset');
  log('🎉 Downloadable applications created successfully!', 'green');
  log('', 'reset');
  log('📁 Generated files:', 'bright');
  log(`   ${CONFIG.outputDir}/install.html - Quick installer page`, 'cyan');
  log(`   ${CONFIG.outputDir}/pwa-packages/ - Mobile installation guides`, 'cyan');
  log(`   ${CONFIG.outputDir}/desktop-builds/ - Desktop applications (if built)`, 'cyan');
  log(`   ${CONFIG.outputDir}/INSTALLATION.md - Complete instructions`, 'cyan');
  log('', 'reset');
  log('📋 Next steps:', 'bright');
  log('1. Open install.html in a browser to test', 'yellow');
  log('2. Upload files to your web server for distribution', 'yellow');
  log('3. Share the installation links with your users', 'yellow');
  log('4. Consider app store submission for wider reach', 'yellow');
  log('', 'reset');
  log(`🌐 Your app: ${CONFIG.deployedUrl}`, 'green');
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = { main, CONFIG };
