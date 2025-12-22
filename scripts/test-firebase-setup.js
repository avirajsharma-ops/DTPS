/**
 * Firebase Setup Test Script
 * Run with: node scripts/test-firebase-setup.js
 * 
 * This script verifies your Firebase credentials are correctly configured.
 */

require('dotenv').config();

const REQUIRED_ENV_VARS = [
    // Backend (Admin SDK) - Required
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',

    // Frontend (Client SDK) - Required for web push
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
];

const OPTIONAL_ENV_VARS = [
    'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
];

console.log('🔥 Firebase Setup Verification\n');
console.log('='.repeat(50));

let hasErrors = false;
let hasWarnings = false;

// Check required environment variables
console.log('\n📋 Checking Required Environment Variables:\n');

REQUIRED_ENV_VARS.forEach((varName) => {
    const value = process.env[varName];
    if (!value) {
        console.log(`❌ ${varName}: MISSING`);
        hasErrors = true;
    } else if (value.includes('REPLACE_WITH') || value.includes('YOUR_')) {
        console.log(`⚠️  ${varName}: Contains placeholder value`);
        hasWarnings = true;
    } else {
        // Mask sensitive values
        const masked = varName.includes('KEY') || varName.includes('SECRET')
            ? value.substring(0, 10) + '...'
            : value.substring(0, 20) + (value.length > 20 ? '...' : '');
        console.log(`✅ ${varName}: ${masked}`);
    }
});

// Check optional environment variables
console.log('\n📋 Checking Optional Environment Variables:\n');

OPTIONAL_ENV_VARS.forEach((varName) => {
    const value = process.env[varName];
    if (!value) {
        console.log(`⚪ ${varName}: Not set (optional)`);
    } else {
        console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
    }
});

// Verify private key format
console.log('\n🔐 Verifying Private Key Format:\n');

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
    const formattedKey = privateKey.replace(/\\n/g, '\n');
    if (formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
        console.log('✅ Private key has correct header');
    } else {
        console.log('❌ Private key missing header (-----BEGIN PRIVATE KEY-----)');
        hasErrors = true;
    }

    if (formattedKey.includes('-----END PRIVATE KEY-----')) {
        console.log('✅ Private key has correct footer');
    } else {
        console.log('❌ Private key missing footer (-----END PRIVATE KEY-----)');
        hasErrors = true;
    }
}

// Test Firebase Admin initialization (if credentials look valid)
console.log('\n🧪 Testing Firebase Admin SDK Initialization:\n');

if (!hasErrors) {
    try {
        const admin = require('firebase-admin');

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            });
        }

        console.log('✅ Firebase Admin SDK initialized successfully');
        console.log(`   Project ID: ${admin.app().options.projectId || process.env.FIREBASE_PROJECT_ID}`);

        // Try to get messaging
        const messaging = admin.messaging();
        console.log('✅ Firebase Messaging service is accessible');

    } catch (error) {
        console.log(`❌ Firebase Admin SDK initialization failed: ${error.message}`);
        hasErrors = true;
    }
} else {
    console.log('⏭️  Skipping Firebase Admin test (missing credentials)');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 Summary:\n');

if (hasErrors) {
    console.log('❌ Configuration has ERRORS. Please fix the issues above.');
    console.log('\n📖 Setup Instructions:');
    console.log('1. Go to Firebase Console: https://console.firebase.google.com');
    console.log('2. Create or select your project');
    console.log('3. Go to Project Settings > Service Accounts');
    console.log('4. Generate a new private key (download JSON)');
    console.log('5. Copy values from JSON to your .env file');
    console.log('6. Go to Project Settings > Cloud Messaging');
    console.log('7. Generate a Web Push certificate for VAPID key');
    console.log('8. Go to Project Settings > General > Your apps');
    console.log('9. Add a Web app to get the public Firebase config');
    process.exit(1);
} else if (hasWarnings) {
    console.log('⚠️  Configuration has warnings. Please review the issues above.');
    process.exit(0);
} else {
    console.log('✅ All Firebase credentials are properly configured!');
    console.log('\n🎉 You can now use Firebase Cloud Messaging for push notifications.');
    process.exit(0);
}
