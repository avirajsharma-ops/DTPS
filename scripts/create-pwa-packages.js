#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

console.log('📱 Creating PWA Download Packages...\n');

// Configuration
const config = {
  appName: 'DTPS Nutrition',
  deployedUrl: 'https://dtps-nutrition.vercel.app', // Replace with your actual URL
  outputDir: 'pwa-packages',
  version: '1.0.0'
};

// Create output directory
function ensureOutputDir() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
}

// Create Android APK instructions
function createAndroidPackage() {
  console.log('🤖 Creating Android package instructions...');
  
  const androidInstructions = `
# Android Installation Guide

## Method 1: PWA Installation (Recommended)
1. Open Chrome browser on your Android device
2. Visit: ${config.deployedUrl}
3. Tap the menu (⋮) in Chrome
4. Select "Add to Home screen"
5. Tap "Add" to install the app
6. The app will appear on your home screen

## Method 2: Using PWA Builder (For APK)
1. Visit https://www.pwabuilder.com/
2. Enter your website URL: ${config.deployedUrl}
3. Click "Start" and wait for analysis
4. Click "Build My PWA"
5. Select "Android" platform
6. Download the generated APK
7. Install the APK on your Android device

## Features
- ✅ Works offline
- ✅ Push notifications
- ✅ Native app experience
- ✅ Auto-updates
- ✅ Home screen icon

## Requirements
- Android 5.0 (API level 21) or higher
- Chrome browser (for PWA installation)
`;

  fs.writeFileSync(path.join(config.outputDir, 'android-installation.md'), androidInstructions);
  
  // Create a simple HTML file for Android installation
  const androidHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Install ${config.appName} on Android</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .install-btn { background: #16a34a; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; display: block; width: 100%; margin: 20px 0; }
        .install-btn:hover { background: #15803d; }
        .step { background: #f0f9ff; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #0ea5e9; }
    </style>
</head>
<body>
    <h1>Install ${config.appName} on Android</h1>
    
    <button class="install-btn" onclick="window.open('${config.deployedUrl}', '_blank')">
        🚀 Open App & Install
    </button>
    
    <h2>Installation Steps:</h2>
    <div class="step">
        <strong>Step 1:</strong> Click the button above to open the app in your browser
    </div>
    <div class="step">
        <strong>Step 2:</strong> Tap the menu (⋮) in your browser
    </div>
    <div class="step">
        <strong>Step 3:</strong> Select "Add to Home screen"
    </div>
    <div class="step">
        <strong>Step 4:</strong> Tap "Add" to install the app
    </div>
    
    <p><strong>Note:</strong> This will install the app as a Progressive Web App (PWA) with native-like functionality.</p>
</body>
</html>
`;

  fs.writeFileSync(path.join(config.outputDir, 'install-android.html'), androidHtml);
  console.log('✅ Android package created\n');
}

// Create iOS installation instructions
function createiOSPackage() {
  console.log('🍎 Creating iOS package instructions...');
  
  const iosInstructions = `
# iOS Installation Guide

## Installation Steps
1. Open Safari browser on your iPhone/iPad
2. Visit: ${config.deployedUrl}
3. Tap the Share button (□↑) at the bottom of Safari
4. Scroll down and tap "Add to Home Screen"
5. Tap "Add" in the top-right corner
6. The app will appear on your home screen

## Features
- ✅ Works offline
- ✅ Native app experience
- ✅ Full-screen mode
- ✅ Home screen icon
- ✅ Auto-updates

## Requirements
- iOS 11.3 or later
- Safari browser (required for PWA installation)

## Note
iOS PWAs have some limitations compared to native apps, but provide
a great app-like experience with offline functionality.
`;

  fs.writeFileSync(path.join(config.outputDir, 'ios-installation.md'), iosInstructions);
  
  // Create HTML file for iOS installation
  const iosHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Install ${config.appName} on iOS</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .install-btn { background: #007AFF; color: white; padding: 15px 30px; border: none; border-radius: 12px; font-size: 16px; cursor: pointer; display: block; width: 100%; margin: 20px 0; }
        .install-btn:hover { background: #0056CC; }
        .step { background: #f2f2f7; padding: 15px; margin: 10px 0; border-radius: 12px; }
        .share-icon { font-size: 24px; }
    </style>
</head>
<body>
    <h1>Install ${config.appName} on iOS</h1>
    
    <button class="install-btn" onclick="window.open('${config.deployedUrl}', '_blank')">
        🚀 Open App & Install
    </button>
    
    <h2>Installation Steps:</h2>
    <div class="step">
        <strong>Step 1:</strong> Click the button above to open the app in Safari
    </div>
    <div class="step">
        <strong>Step 2:</strong> Tap the Share button <span class="share-icon">□↑</span> at the bottom
    </div>
    <div class="step">
        <strong>Step 3:</strong> Scroll down and tap "Add to Home Screen"
    </div>
    <div class="step">
        <strong>Step 4:</strong> Tap "Add" to install the app
    </div>
    
    <p><strong>Important:</strong> You must use Safari browser for PWA installation on iOS.</p>
</body>
</html>
`;

  fs.writeFileSync(path.join(config.outputDir, 'install-ios.html'), iosHtml);
  console.log('✅ iOS package created\n');
}

// Create Windows installation package
function createWindowsPackage() {
  console.log('🪟 Creating Windows package instructions...');
  
  const windowsInstructions = `
# Windows Installation Guide

## Method 1: PWA Installation (Edge/Chrome)
1. Open Microsoft Edge or Google Chrome
2. Visit: ${config.deployedUrl}
3. Click the install icon (⊕) in the address bar
4. Click "Install" in the popup
5. The app will be installed and appear in Start Menu

## Method 2: Manual Installation
1. Open Edge or Chrome browser
2. Visit: ${config.deployedUrl}
3. Click the menu (⋯) in the browser
4. Select "Apps" → "Install this site as an app"
5. Click "Install"

## Method 3: Desktop Application
For a native desktop experience, download the Electron-based application:
1. Download the Windows installer from the releases
2. Run the .exe file
3. Follow the installation wizard
4. Launch from Start Menu or Desktop

## Features
- ✅ Native Windows integration
- ✅ Start Menu shortcut
- ✅ Taskbar pinning
- ✅ Offline functionality
- ✅ System notifications

## Requirements
- Windows 10 version 1903 or later
- Microsoft Edge or Google Chrome browser
`;

  fs.writeFileSync(path.join(config.outputDir, 'windows-installation.md'), windowsInstructions);
  
  // Create HTML for Windows installation
  const windowsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Install ${config.appName} on Windows</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
        .install-btn { background: #0078d4; color: white; padding: 15px 30px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; display: block; width: 100%; margin: 20px 0; }
        .install-btn:hover { background: #106ebe; }
        .method { background: #f3f2f1; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #0078d4; }
    </style>
</head>
<body>
    <h1>Install ${config.appName} on Windows</h1>
    
    <button class="install-btn" onclick="window.open('${config.deployedUrl}', '_blank')">
        🚀 Open App & Install
    </button>
    
    <div class="method">
        <h3>Method 1: Browser Installation</h3>
        <p>1. Click the button above to open the app</p>
        <p>2. Look for the install icon (⊕) in the address bar</p>
        <p>3. Click "Install" to add to your system</p>
    </div>
    
    <div class="method">
        <h3>Method 2: Desktop Application</h3>
        <p>Download the native Windows application for the best experience:</p>
        <button class="install-btn" onclick="alert('Desktop version coming soon!')">
            💻 Download Desktop App
        </button>
    </div>
</body>
</html>
`;

  fs.writeFileSync(path.join(config.outputDir, 'install-windows.html'), windowsHtml);
  console.log('✅ Windows package created\n');
}

// Create a universal installer page
function createUniversalInstaller() {
  console.log('🌐 Creating universal installer...');
  
  const universalHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Install ${config.appName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .container { background: white; border-radius: 20px; padding: 40px; max-width: 500px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.1); text-align: center; }
        .logo { width: 80px; height: 80px; background: #16a34a; border-radius: 20px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px; font-weight: bold; }
        h1 { color: #1f2937; margin-bottom: 10px; }
        .subtitle { color: #6b7280; margin-bottom: 30px; }
        .platform-btn { display: block; width: 100%; padding: 15px; margin: 10px 0; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; text-decoration: none; color: white; }
        .android { background: #34d399; }
        .android:hover { background: #10b981; }
        .ios { background: #3b82f6; }
        .ios:hover { background: #2563eb; }
        .windows { background: #8b5cf6; }
        .windows:hover { background: #7c3aed; }
        .web { background: #f59e0b; }
        .web:hover { background: #d97706; }
        .features { text-align: left; margin-top: 30px; }
        .feature { display: flex; align-items: center; margin: 10px 0; color: #4b5563; }
        .feature::before { content: '✅'; margin-right: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">DN</div>
        <h1>${config.appName}</h1>
        <p class="subtitle">Choose your platform to install the app</p>
        
        <a href="install-android.html" class="platform-btn android">
            📱 Install on Android
        </a>
        
        <a href="install-ios.html" class="platform-btn ios">
            🍎 Install on iPhone/iPad
        </a>
        
        <a href="install-windows.html" class="platform-btn windows">
            🪟 Install on Windows
        </a>
        
        <a href="${config.deployedUrl}" class="platform-btn web" target="_blank">
            🌐 Use Web Version
        </a>
        
        <div class="features">
            <div class="feature">Works offline</div>
            <div class="feature">Push notifications</div>
            <div class="feature">Native app experience</div>
            <div class="feature">Auto-updates</div>
        </div>
    </div>
    
    <script>
        // Auto-detect platform and highlight appropriate option
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('android')) {
            document.querySelector('.android').style.transform = 'scale(1.05)';
            document.querySelector('.android').style.boxShadow = '0 10px 20px rgba(52, 211, 153, 0.3)';
        } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
            document.querySelector('.ios').style.transform = 'scale(1.05)';
            document.querySelector('.ios').style.boxShadow = '0 10px 20px rgba(59, 130, 246, 0.3)';
        } else if (userAgent.includes('windows')) {
            document.querySelector('.windows').style.transform = 'scale(1.05)';
            document.querySelector('.windows').style.boxShadow = '0 10px 20px rgba(139, 92, 246, 0.3)';
        }
    </script>
</body>
</html>
`;

  fs.writeFileSync(path.join(config.outputDir, 'index.html'), universalHtml);
  console.log('✅ Universal installer created\n');
}

// Create README with instructions
function createReadme() {
  const readme = `
# ${config.appName} - Download Packages

This folder contains installation packages and instructions for installing ${config.appName} on different platforms.

## Quick Start
Open \`index.html\` in a web browser to see the universal installer.

## Files
- \`index.html\` - Universal installer page
- \`install-android.html\` - Android installation guide
- \`install-ios.html\` - iOS installation guide  
- \`install-windows.html\` - Windows installation guide
- \`*.md\` files - Detailed installation instructions

## Deployment
Upload these files to your web server to provide download links for your users.

## App URL
${config.deployedUrl}

## Version
${config.version}
`;

  fs.writeFileSync(path.join(config.outputDir, 'README.md'), readme);
}

// Main function
function main() {
  console.log(`Creating download packages for ${config.appName}...\n`);
  
  ensureOutputDir();
  createAndroidPackage();
  createiOSPackage();
  createWindowsPackage();
  createUniversalInstaller();
  createReadme();
  
  console.log('🎉 PWA download packages created successfully!');
  console.log(`📁 Check the '${config.outputDir}' folder for all installation files.`);
  console.log('\n📋 Next steps:');
  console.log('1. Update the deployedUrl in the configuration');
  console.log('2. Upload the files to your web server');
  console.log('3. Share the installation links with your users');
  console.log('4. Consider creating actual app store packages for wider distribution');
}

if (require.main === module) {
  main();
}

module.exports = { main, config };
