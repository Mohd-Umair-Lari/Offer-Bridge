import { mongoService } from '@/lib/mongoService';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;
    
    if (!status) {
      return Response.json({ error: 'Status required' }, { status: 400 });
    }
    
    const result = await mongoService.updateEscrowStatus(id, status);
    
    if (result.error) {
      console.error('[API] Escrow update error:', result.error);
      return Response.json({ error: result.error }, { status: 500 });
    }
    
    return Response.json({ data: result.data });
  } catch (error) {
    console.error('[API] updateEscrowStatus error:', error?.message);
    return Response.json({ error: error?.message || 'Failed to update escrow' }, { status: 500 });
  }
}
