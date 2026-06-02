import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// NOTE: do NOT throw here at module level — that would crash every route that
// imports this file before any request handler can catch the error.
// The guard is inside connectDB() so it only throws at call-time.

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in environment variables. Add it to your .env file.');
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    }).then(m => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
