import { mongoService } from '@/lib/mongoService';

export async function GET(request, { params }) {
  try {
    const { userId } = await params;
    
    if (!userId) {
      return Response.json({ error: 'User ID required' }, { status: 400 });
    }
    
    console.log('[API] Fetching profile for userId:', userId);
    const result = await mongoService.getProfile(userId);
    
    if (result.error) {
      console.error('[API] Profile fetch error:', result.error);
      return Response.json({ error: result.error }, { status: 500 });
    }
    
    if (!result.data) {
      console.warn('[API] Profile not found for userId:', userId);
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    return Response.json({ data: result.data });
  } catch (error) {
    console.error('[API] getProfile error:', error?.message);
    return Response.json({ error: error?.message || 'Failed to fetch profile' }, { status: 500 });
  }
}
