#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Building DTPS Nutrition Desktop Application...\n');

// Configuration
const config = {
  appName: 'DTPS Nutrition',
  appId: 'com.dtpsnutrition.desktop',
  version: '1.0.0',
  deployedUrl: 'https://dtps.tech/', // Replace with your actual URL
  outputDir: 'desktop-builds',
  electronDir: 'electron'
};

// Ensure directories exist
function ensureDirectories() {
  console.log('📁 Setting up directories...');
  
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
  
  if (!fs.existsSync(path.join(config.electronDir, 'assets'))) {
    fs.mkdirSync(path.join(config.electronDir, 'assets'), { recursive: true });
  }
  
  console.log('✅ Directories ready\n');
}

// Update configuration files with deployed URL
function updateConfig() {
  console.log('⚙️  Updating configuration...');
  
  // Update main.js with deployed URL
  const mainJsPath = path.join(config.electronDir, 'main.js');
  let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
  mainJsContent = mainJsContent.replace(
    'https://dtps.tech/',
    config.deployedUrl
  );
  fs.writeFileSync(mainJsPath, mainJsContent);
  
  // Update package.json with deployed URL
  const packageJsonPath = path.join(config.electronDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.homepage = config.deployedUrl;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log('✅ Configuration updated\n');
}

// Create basic icons (you should replace these with proper icons)
function createBasicIcons() {
  console.log('🎨 Creating basic icons...');
  
  const assetsDir = path.join(config.electronDir, 'assets');
  
  // Create a simple text-based icon (replace with actual icons)
  const iconSvg = `
    <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="#16a34a"/>
      <text x="256" y="280" font-family="Arial, sans-serif" font-size="120" 
            fill="white" text-anchor="middle" font-weight="bold">DN</text>
      <text x="256" y="350" font-family="Arial, sans-serif" font-size="32" 
            fill="white" text-anchor="middle">Nutrition</text>
    </svg>
  `;
  
  fs.writeFileSync(path.join(assetsDir, 'icon.svg'), iconSvg);
  
  // Create placeholder files for different formats
  const placeholderFiles = [
    'icon.png',
    'icon.ico',
    'icon.icns',
    'dmg-background.png'
  ];
  
  placeholderFiles.forEach(file => {
    const filePath = path.join(assetsDir, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, ''); // Placeholder
    }
  });
  
  console.log('✅ Basic icons created (replace with proper icons)\n');
}

// Install dependencies
function installDependencies() {
  console.log('📦 Installing Electron dependencies...');
  
  try {
    process.chdir(config.electronDir);
    execSync('npm install', { stdio: 'inherit' });
    process.chdir('..');
    console.log('✅ Dependencies installed\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Build applications
function buildApplications() {
  console.log('🔨 Building desktop applications...');
  
  try {
    process.chdir(config.electronDir);
    
    // Build for current platform
    console.log('Building for current platform...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Optionally build for all platforms (requires additional setup)
    // console.log('Building for all platforms...');
    // execSync('npm run build-all', { stdio: 'inherit' });
    
    process.chdir('..');
    console.log('✅ Applications built successfully\n');
  } catch (error) {
    console.error('❌ Failed to build applications:', error.message);
    process.exit(1);
  }
}

// Copy built files to output directory
function copyBuiltFiles() {
  console.log('📋 Copying built files...');
  
  const distDir = path.join(config.electronDir, 'dist');
  
  if (fs.existsSync(distDir)) {
    // Copy all files from dist to output directory
    execSync(`cp -r "${distDir}"/* "${config.outputDir}"/`, { stdio: 'inherit' });
    console.log('✅ Built files copied to', config.outputDir, '\n');
  } else {
    console.log('⚠️  No dist directory found. Build may have failed.\n');
  }
}

// Generate download instructions
function generateInstructions() {
  console.log('📝 Generating download instructions...');
  
  const instructions = `
# DTPS Nutrition Desktop Application

## Download Instructions

### Windows
- **Installer**: Look for \`DTPS Nutrition Setup.exe\` in the builds folder
- **Portable**: Look for \`DTPS Nutrition.exe\` (portable version)

### macOS
- **DMG**: Look for \`DTPS Nutrition.dmg\` in the builds folder
- **ZIP**: Look for \`DTPS Nutrition-mac.zip\` (alternative format)

### Linux
- **AppImage**: Look for \`DTPS Nutrition.AppImage\` (universal Linux)
- **DEB**: Look for \`dtps-nutrition_1.0.0_amd64.deb\` (Debian/Ubuntu)
- **RPM**: Look for \`dtps-nutrition-1.0.0.x86_64.rpm\` (RedHat/Fedora)

## Installation

### Windows
1. Download \`DTPS Nutrition Setup.exe\`
2. Run the installer
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

### macOS
1. Download \`DTPS Nutrition.dmg\`
2. Open the DMG file
3. Drag the app to Applications folder
4. Launch from Applications or Launchpad

### Linux
1. Download the appropriate package for your distribution
2. For AppImage: Make executable and run directly
3. For DEB: \`sudo dpkg -i dtps-nutrition_1.0.0_amd64.deb\`
4. For RPM: \`sudo rpm -i dtps-nutrition-1.0.0.x86_64.rpm\`

## Features
- ✅ Native desktop application
- ✅ Offline functionality
- ✅ System notifications
- ✅ Auto-updates (when configured)
- ✅ Cross-platform compatibility

## Requirements
- Windows 10 or later
- macOS 10.14 or later
- Linux (most modern distributions)

## Support
For support, visit: ${config.deployedUrl}
`;

  fs.writeFileSync(path.join(config.outputDir, 'README.md'), instructions);
  console.log('✅ Instructions generated\n');
}

// Main build process
async function main() {
  try {
    console.log(`Building ${config.appName} v${config.version}\n`);
    
    ensureDirectories();
    updateConfig();
    createBasicIcons();
    installDependencies();
    buildApplications();
    copyBuiltFiles();
    generateInstructions();
    
    console.log('🎉 Desktop application build complete!');
    console.log(`📁 Check the '${config.outputDir}' folder for your downloadable applications.`);
    console.log('\n📋 Next steps:');
    console.log('1. Replace placeholder icons in electron/assets/ with proper app icons');
    console.log('2. Update the deployed URL in the configuration');
    console.log('3. Test the applications on different platforms');
    console.log('4. Set up code signing for production releases');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, config };
