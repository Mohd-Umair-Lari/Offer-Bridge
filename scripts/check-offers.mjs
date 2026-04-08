import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://umairlari0786_db_user:umairlari000@ac-ehziul4-shard-00-00.xskkplv.mongodb.net:27017,ac-ehziul4-shard-00-01.xskkplv.mongodb.net:27017,ac-ehziul4-shard-00-02.xskkplv.mongodb.net:27017/offerbridge?ssl=true&replicaSet=atlas-m0-shard-0&authSource=admin&retryWrites=true&w=majority';

async function checkOffers() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('offerbridge');
    
    // Check all offers
    const offers = await db.collection('offers').find({}).toArray();
    console.log('\n✓ Total offers:', offers.length);
    
    offers.forEach((offer, index) => {
      console.log(`\nOffer ${index + 1}:`);
      console.log(`  _id: ${offer._id}`);
      console.log(`  card_name: ${offer.card_name}`);
      console.log(`  user_id: ${offer.user_id}`);
      console.log(`  is_public: ${offer.is_public} (${typeof offer.is_public})`);
      console.log(`  status: ${offer.status}`);
    });

    // Count public vs private
    const publicCount = offers.filter(o => o.is_public !== false).length;
    const privateCount = offers.filter(o => o.is_public === false).length;
    console.log(`\n📊 Summary:`);
    console.log(`  Public: ${publicCount}`);
    console.log(`  Private: ${privateCount}`);
    console.log(`  Undefined is_public: ${offers.filter(o => o.is_public === undefined).length}`);

  } finally {
    await client.close();
  }
}

checkOffers().catch(console.error);
