// Script to deploy Firestore rules and indexes
const { execSync } = require('child_process');
const fs = require('fs');

console.log('Checking Firebase login status...');

try {
  // Verify Firebase CLI is installed
  try {
    execSync('firebase --version', { stdio: 'inherit' });
  } catch (error) {
    console.error('Firebase CLI is not installed. Install it with: npm install -g firebase-tools');
    process.exit(1);
  }

  // Check if rules files exist
  if (!fs.existsSync('./firestore.rules')) {
    console.error('firestore.rules file not found');
    process.exit(1);
  }

  if (!fs.existsSync('./firestore.indexes.json')) {
    console.error('firestore.indexes.json file not found');
    process.exit(1);
  }

  // Deploy Firestore rules and indexes
  console.log('Deploying Firestore rules and indexes...');
  execSync('firebase deploy --only firestore:rules,firestore:indexes', { stdio: 'inherit' });
  
  console.log('✅ Deployment successful!');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
} 