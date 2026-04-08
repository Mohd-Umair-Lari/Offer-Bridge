import { mongoService } from '@/lib/mongoService';

export async function GET() {
  try {
    const result = await mongoService.fetchAll();
    
    if (result.error) {
      console.error('[API] Data fetch failed:', result.error);
      return Response.json({ error: result.error }, { status: 500 });
    }
    
    return Response.json(result.data);
  } catch (error) {
    console.error('[API] fetchAll error:', error?.message);
    return Response.json({ error: error?.message || 'Failed to fetch data' }, { status: 500 });
  }
}
