import { getDatabase } from '../src/lib/mongodb.js';

/**
 * MongoDB Collections Setup Script
 * Creates all necessary collections and indexes for OfferBridge
 * 
 * Usage: node scripts/init-collections.mjs
 */

async function initializeCollections() {
  try {
    console.log('[MongoDB] Initializing collections...');
    const db = await getDatabase();

    // Create Users Collection
    try {
      await db.createCollection('users');
      console.log('[✓] Users collection created');
    } catch (error) {
      if (error.code === 48) { // Collection already exists
        console.log('[✓] Users collection already exists');
      } else {
        throw error;
      }
    }

    // Create Profiles Collection
    try {
      await db.createCollection('profiles');
      console.log('[✓] Profiles collection created');
    } catch (error) {
      if (error.code === 48) {
        console.log('[✓] Profiles collection already exists');
      } else {
        throw error;
      }
    }

    // Create Requests Collection
    try {
      await db.createCollection('requests');
      console.log('[✓] Requests collection created');
    } catch (error) {
      if (error.code === 48) {
        console.log('[✓] Requests collection already exists');
      } else {
        throw error;
      }
    }

    // Create Offers Collection
    try {
      await db.createCollection('offers');
      console.log('[✓] Offers collection created');
    } catch (error) {
      if (error.code === 48) {
        console.log('[✓] Offers collection already exists');
      } else {
        throw error;
      }
    }

    // Create Escrow Collection
    try {
      await db.createCollection('escrow');
      console.log('[✓] Escrow collection created');
    } catch (error) {
      if (error.code === 48) {
        console.log('[✓] Escrow collection already exists');
      } else {
        throw error;
      }
    }

    // Create Disputes Collection
    try {
      await db.createCollection('disputes');
      console.log('[✓] Disputes collection created');
    } catch (error) {
      if (error.code === 48) {
        console.log('[✓] Disputes collection already exists');
      } else {
        throw error;
      }
    }

    // Create Indexes
    console.log('\n[MongoDB] Creating indexes...');

    // Users indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('[✓] Email index created on users');

    // Profiles indexes
    await db.collection('profiles').createIndex({ user_id: 1 }, { unique: true });
    console.log('[✓] User ID index created on profiles');

    // Requests indexes
    await db.collection('requests').createIndex({ user_id: 1 });
    await db.collection('requests').createIndex({ created_at: -1 });
    console.log('[✓] Indexes created on requests');

    // Offers indexes
    await db.collection('offers').createIndex({ user_id: 1 });
    await db.collection('offers').createIndex({ created_at: -1 });
    console.log('[✓] Indexes created on offers');

    // Escrow indexes
    await db.collection('escrow').createIndex({ status: 1 });
    console.log('[✓] Status index created on escrow');

    // Disputes indexes
    await db.collection('disputes').createIndex({ status: 1 });
    console.log('[✓] Status index created on disputes');

    console.log('\n✅ All collections and indexes initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[❌] Error initializing collections:', error);
    process.exit(1);
  }
}

initializeCollections();
