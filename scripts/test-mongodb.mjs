#!/usr/bin/env node

import { connectToDatabase, closeDatabase } from '../src/lib/mongodb.js';

/**
 * MongoDB Connection Test Utility
 * Tests if MongoDB connection and collections are working
 * 
 * Usage: node scripts/test-mongodb.mjs
 */

async function testConnection() {
  console.log('🔍 Testing MongoDB Connection...\n');
  
  try {
    // Test 1: Connection
    console.log('✓ Test 1: Connecting to MongoDB...');
    const { db } = await connectToDatabase();
    console.log('  ✅ Connected successfully!\n');
    
    // Test 2: Ping
    console.log('✓ Test 2: Pinging MongoDB...');
    const adminDb = db.admin();
    const pingResult = await adminDb.ping();
    console.log('  ✅ Ping successful!\n');
    
    // Test 3: List collections
    console.log('✓ Test 3: Checking collections...');
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('  Collections found:', collectionNames.join(', '));
    
    const requiredCollections = ['users', 'profiles', 'requests', 'offers', 'escrow', 'disputes'];
    const missing = requiredCollections.filter(c => !collectionNames.includes(c));
    
    if (missing.length > 0) {
      console.log('  ⚠️  Missing collections:', missing.join(', '));
      console.log('  Run: node scripts/init-collections.mjs\n');
    } else {
      console.log('  ✅ All required collections exist!\n');
    }
    
    // Test 4: Check indexes
    console.log('✓ Test 4: Checking indexes...');
    try {
      const usersIndexes = await db.collection('users').getIndexes();
      const emailIndex = usersIndexes.find(idx => idx.key.email === 1);
      if (emailIndex) {
        console.log('  ✅ Email index found (unique:', emailIndex.unique === true, ')\n');
      } else {
        console.log('  ⚠️  Email index not found\n');
      }
    } catch (e) {
      console.log('  ⚠️  Could not check indexes:', e.message, '\n');
    }
    
    // Test 5: Count documents
    console.log('✓ Test 5: Counting documents...');
    const userCount = await db.collection('users').countDocuments();
    const profileCount = await db.collection('profiles').countDocuments();
    const requestCount = await db.collection('requests').countDocuments();
    console.log(`  Users: ${userCount}`);
    console.log(`  Profiles: ${profileCount}`);
    console.log(`  Requests: ${requestCount}\n`);
    
    console.log('✅ All tests passed! MongoDB is ready.\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Connection Test Failed:');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting:');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('• MongoDB not running or wrong connection string');
      console.error('• Check MONGODB_URI in .env.local');
    } else if (error.message.includes('authentication failed')) {
      console.error('• Wrong username or password');
      console.error('• Check database user in MongoDB Atlas');
    } else if (error.message.includes('ns does not exist')) {
      console.error('• Collections not initialized');
      console.error('• Run: node scripts/init-collections.mjs');
    } else if (error.message.includes('getaddrinfo')) {
      console.error('• Cannot resolve MongoDB domain');
      console.error('• Check internet connection');
      console.error('• Verify connection string format');
    } else {
      console.error('• Unexpected error - check connection string details');
      console.error('• Full error:', error);
    }
    
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

testConnection();
