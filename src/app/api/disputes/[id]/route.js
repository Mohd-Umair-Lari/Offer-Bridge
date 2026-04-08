import { mongoService } from '@/lib/mongoService';

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;
    
    if (!status) {
      return Response.json({ error: 'Status required' }, { status: 400 });
    }
    
    const result = await mongoService.updateDisputeStatus(id, status);
    
    if (result.error) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    
    return Response.json({ data: result.data });
  } catch (error) {
    console.error('[API] updateDisputeStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
