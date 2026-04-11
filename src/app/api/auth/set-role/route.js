import { getDatabase } from '@/lib/mongodb';

export async function POST(request) {
  try {
    console.log('[API] set-role route called');
    const { email, role } = await request.json();

    if (!email || !role) {
      return Response.json(
        { error: 'Email and role required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['customer', 'provider', 'customer_provider'];
    if (!validRoles.includes(role)) {
      return Response.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Update user role
    const result = await db.collection('users').updateOne(
      { email },
      {
        $set: {
          role,
          updated_at: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[API] User role updated:', { email, role });

    return Response.json({
      success: true,
      message: 'Role set successfully',
    });
  } catch (error) {
    console.error('[API] set-role error:', error);
    return Response.json(
      { error: error.message || 'Failed to set role' },
      { status: 500 }
    );
  }
}
