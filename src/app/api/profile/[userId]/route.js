import { mongoService } from '@/lib/mongoService';

export async function GET(request, { params }) {
  try {
    const { userId } = params;
    
    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 });
    }
    
    const result = await mongoService.getProfile(userId);
    
    if (result.error) {
      return Response.json({ error: result.error }, { status: 400 });
    }
    
    return Response.json({ data: result.data });
  } catch (error) {
    console.error('[API] getProfile error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
