#!/usr/bin/env node

/**
 * Android Build Script for DTPS
 * 
 * This script helps build APK and AAB files for distribution
 * 
 * Usage:
 *   node scripts/build-android.js [options]
 * 
 * Options:
 *   --debug     Build debug version
 *   --release   Build release version
 *   --apk       Build APK only
 *   --aab       Build AAB only (for Play Store)
 *   --all       Build both APK and AAB
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    debug: args.includes('--debug'),
    release: args.includes('--release') || !args.includes('--debug'),
    apk: args.includes('--apk') || args.includes('--all') || (!args.includes('--aab')),
    aab: args.includes('--aab') || args.includes('--all'),
};

const projectRoot = path.join(__dirname, '..');
const androidDir = path.join(projectRoot, 'android');
const outputDir = path.join(projectRoot, 'build-output');

console.log('🤖 DTPS Android Build Script\n');
console.log('='.repeat(50));
console.log(`Build Type: ${options.release ? 'Release' : 'Debug'}`);
console.log(`Build APK: ${options.apk ? 'Yes' : 'No'}`);
console.log(`Build AAB: ${options.aab ? 'Yes' : 'No'}`);
console.log('='.repeat(50));
console.log('');

// Create output directory
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Helper function to run commands
function run(command, cwd = projectRoot) {
    console.log(`\n📍 Running: ${command}\n`);
    try {
        execSync(command, {
            cwd,
            stdio: 'inherit',
            shell: true
        });
        return true;
    } catch (error) {
        console.error(`❌ Command failed: ${command}`);
        return false;
    }
}

// Helper function to copy file
function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`✅ Copied: ${path.basename(dest)}`);
        return true;
    } else {
        console.log(`⚠️  File not found: ${src}`);
        return false;
    }
}

async function main() {
    console.log('Step 1: Syncing Capacitor...');
    if (!run('npx cap sync android')) {
        console.error('❌ Failed to sync Capacitor');
        process.exit(1);
    }

    // Change to Android directory
    process.chdir(androidDir);

    const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
    const buildType = options.release ? 'Release' : 'Debug';

    if (options.apk) {
        console.log(`\nStep 2: Building ${buildType} APK...`);
        const apkCommand = `${gradleCommand} assemble${buildType}`;

        if (!run(apkCommand, androidDir)) {
            console.error('❌ Failed to build APK');
            process.exit(1);
        }

        // Copy APK to output directory
        const apkFileName = options.release ? 'app-release.apk' : 'app-debug.apk';
        const apkPath = path.join(androidDir, 'app', 'build', 'outputs', 'apk', buildType.toLowerCase(), apkFileName);
        const destApk = path.join(outputDir, `DTPS-${buildType.toLowerCase()}.apk`);

        copyFile(apkPath, destApk);
    }

    if (options.aab) {
        console.log(`\nStep 3: Building ${buildType} AAB...`);
        const aabCommand = `${gradleCommand} bundle${buildType}`;

        if (!run(aabCommand, androidDir)) {
            console.error('❌ Failed to build AAB');
            process.exit(1);
        }

        // Copy AAB to output directory
        const aabFileName = options.release ? 'app-release.aab' : 'app-debug.aab';
        const aabPath = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', buildType.toLowerCase(), aabFileName);
        const destAab = path.join(outputDir, `DTPS-${buildType.toLowerCase()}.aab`);

        copyFile(aabPath, destAab);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Build Complete!\n');
    console.log(`Output directory: ${outputDir}`);

    // List generated files
    if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir);
        if (files.length > 0) {
            console.log('\nGenerated files:');
            files.forEach(file => {
                const filePath = path.join(outputDir, file);
                const stats = fs.statSync(filePath);
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                console.log(`  📦 ${file} (${sizeMB} MB)`);
            });
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('\n📱 Installation Instructions:\n');
    console.log('For Debug APK:');
    console.log('  adb install build-output/DTPS-debug.apk\n');
    console.log('For Release APK:');
    console.log('  adb install build-output/DTPS-release.apk\n');
    console.log('For Play Store (AAB):');
    console.log('  Upload build-output/DTPS-release.aab to Google Play Console\n');
}

main().catch(console.error);
