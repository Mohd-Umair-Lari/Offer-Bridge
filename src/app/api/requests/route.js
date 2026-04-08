import { mongoService } from '@/lib/mongoService';

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await mongoService.insertRequest(body);
    
    if (result.error) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    
    return Response.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error('[API] insertRequest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
