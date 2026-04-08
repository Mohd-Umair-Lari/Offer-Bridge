import { mongoService } from '@/lib/mongoService';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Find user in MongoDB
    const db = await (await import('@/lib/mongodb')).getDatabase();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // In production, use bcrypt to verify passwords
    // For now, simple comparison (NOT SECURE - USE BCRYPT IN PRODUCTION)
    if (user.password !== password) {
      return Response.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;
    return Response.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        ...userWithoutPassword,
      },
    });
  } catch (error) {
    console.error('[API] signin error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
