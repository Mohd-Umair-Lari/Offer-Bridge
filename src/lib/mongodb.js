import { MongoClient } from 'mongodb';

let cachedClient = null;
let cachedDb = null;

function getMongoUrl() {
  const url = process.env.NEXT_PUBLIC_MONGODB_URI || process.env.MONGODB_URI;
  if (!url) {
    throw new Error('MONGODB_URI environment variable is not set. Make sure to configure it in Vercel settings or .env.local');
  }
  return url;
}

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    console.log('[MongoDB] Using cached connection');
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const mongoUrl = getMongoUrl();
    console.log('[MongoDB] Connecting to MongoDB Atlas...');
    const client = new MongoClient(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await client.connect();
    const db = client.db('offerbridge');

    cachedClient = client;
    cachedDb = db;

    console.log('[MongoDB] ✅ Connected successfully');
    return { client, db };
  } catch (error) {
    console.error('[MongoDB] ❌ Connection failed:', error?.message);
    throw error;
  }
}

export async function getDatabase() {
  const { db } = await connectToDatabase();
  return db;
}

export async function closeDatabase() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log('[MongoDB] Connection closed');
  }
}
