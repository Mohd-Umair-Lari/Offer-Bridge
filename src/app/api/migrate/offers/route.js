import { mongoService } from '@/lib/mongoService';

export async function GET() {
  try {
    const db = await (await import('@/lib/mongodb')).getDatabase();
    
    // Update all offers without is_public field to have is_public: true
    const result = await db.collection('offers').updateMany(
      { is_public: { $exists: false } },
      { $set: { is_public: true } }
    );
    
    console.log('[Migration] Updated offers without is_public:', result.modifiedCount);
    
    // Fetch updated offers
    const offers = await db.collection('offers').find({}).toArray();
    
    return Response.json({
      message: 'Migration complete',
      modifiedCount: result.modifiedCount,
      totalOffers: offers.length,
      offers: offers.map(o => ({
        _id: o._id.toString(),
        card_name: o.card_name,
        is_public: o.is_public,
        status: o.status,
      }))
    });
  } catch (error) {
    console.error('[Migration] Error:', error?.message);
    return Response.json({ 
      error: error?.message || 'Migration failed',
      stack: error?.stack 
    }, { status: 500 });
  }
}
