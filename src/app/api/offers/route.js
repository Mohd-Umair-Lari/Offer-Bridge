import { mongoService } from '@/lib/mongoService';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await mongoService.insertOffer(body);
    
    if (result.error) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    
    return Response.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('[API] insertOffer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { offerId, is_public } = body;

    if (!offerId || is_public === undefined) {
      return Response.json(
        { error: 'Offer ID and is_public status required' },
        { status: 400 }
      );
    }

    const result = await mongoService.updateOfferStatus(offerId, is_public);

    if (result.error) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[API] updateOfferStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('id');
    
    if (!offerId) {
      return Response.json({ error: 'Offer ID required' }, { status: 400 });
    }
    
    const result = await mongoService.deleteOffer(offerId);
    
    if (result.error) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('[API] deleteOffer error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
