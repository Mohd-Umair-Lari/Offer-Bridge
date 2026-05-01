import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://umairlari0786_db_user:umairlari000@cluster0.xskkplv.mongodb.net/test?appName=Cluster0"; // Added /test or default db

async function fixDb() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Update transactions
    const result = await mongoose.connection.db.collection('transactions').updateMany(
      { status: 'payment_received' },
      { $set: { status: 'tracking_pending' } }
    );
    
    console.log(`Updated ${result.modifiedCount} transactions from payment_received -> tracking_pending`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

fixDb();
