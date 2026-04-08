import { getDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDatabase();
    
    // Make all offers from the private user public for testing
    const result = await db.collection('offers').updateMany(
      { user_id: '69d6657d8a16a8bcce9c91fa' },
      { $set: { is_public: true } }
    );
    
    console.log('[Fix] Made other users offers public:', result.modifiedCount);
    
    // Also ensure current user's first offer is public
    const currentUserResult = await db.collection('offers').updateMany(
      { user_id: '69d6646c8a16a8bcce9c91f5' },
      { $set: { is_public: true } }
    );
    
    console.log('[Fix] Ensured current user offers public:', currentUserResult.modifiedCount);
    
    // Fetch all offers to verify
    const offers = await db.collection('offers').find({}).toArray();
    const marketOffers = offers.filter(o => o.user_id !== '69d6646c8a16a8bcce9c91f5' && o.is_public !== false);
    
    return Response.json({
      message: 'Fixed marketplace visibility',
      totalOffers: offers.length,
      marketOffersForCurrentUser: marketOffers.length,
      offers: offers.map(o => ({
        _id: o._id.toString(),
        card_name: o.card_name,
        user_id: o.user_id,
        is_public: o.is_public,
      }))
    });
  } catch (error) {
    console.error('[Fix] Error:', error?.message);
    return Response.json({ 
      error: error?.message || 'Fix failed',
      stack: error?.stack 
    }, { status: 500 });
  }
}
