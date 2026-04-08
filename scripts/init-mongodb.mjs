/**
 * MongoDB Collections Initialization Script
 * 
 * Run this ONCE to set up collections with proper structure
 * It will create indices for faster queries
 */

import { connectToDatabase } from '../src/lib/mongodb.js';

async function initializeCollections() {
  console.log('[MongoDB] Initializing collections...');

  try {
    const { db } = await connectToDatabase();

    // ── Create Collections ──
    const collections = ['profiles', 'requests', 'offers', 'escrow', 'disputes'];
    
    for (const collName of collections) {
      try {
        await db.createCollection(collName);
        console.log(`[MongoDB] Created collection: ${collName}`);
      } catch (error) {
        if (error.codeName === 'NamespaceExists') {
          console.log(`[MongoDB] Collection ${collName} already exists`);
        } else {
          throw error;
        }
      }
    }

    // ── Create Indices for Performance ──

    // Profiles: unique user_id
    await db.collection('profiles').createIndex({ user_id: 1 }, { unique: true });
    console.log('[MongoDB] Index created: profiles.user_id');

    // Requests: by user_id, status
    await db.collection('requests').createIndex({ user_id: 1 });
    await db.collection('requests').createIndex({ status: 1 });
    await db.collection('requests').createIndex({ is_public: 1 });
    console.log('[MongoDB] Indices created: requests');

    // Offers: by user_id, status
    await db.collection('offers').createIndex({ user_id: 1 });
    await db.collection('offers').createIndex({ status: 1 });
    await db.collection('offers').createIndex({ is_public: 1 });
    console.log('[MongoDB] Indices created: offers');

    // Escrow: by buyer_id, cardholder_id, status
    await db.collection('escrow').createIndex({ buyer_id: 1 });
    await db.collection('escrow').createIndex({ cardholder_id: 1 });
    await db.collection('escrow').createIndex({ status: 1 });
    console.log('[MongoDB] Indices created: escrow');

    // Disputes: by buyer_id, cardholder_id, status
    await db.collection('disputes').createIndex({ buyer_id: 1 });
    await db.collection('disputes').createIndex({ cardholder_id: 1 });
    await db.collection('disputes').createIndex({ status: 1 });
    console.log('[MongoDB] Indices created: disputes');

    console.log('[MongoDB] ✅ All collections initialized');
    process.exit(0);
  } catch (error) {
    console.error('[MongoDB] ❌ Initialization error:', error?.message);
    process.exit(1);
  }
}

initializeCollections();
