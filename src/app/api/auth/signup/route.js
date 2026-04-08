import { mongoService } from '@/lib/mongoService';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request) {
  try {
    const { email, password, fullName, role } = await request.json();

    if (!email || !password || !fullName) {
      return Response.json(
        { error: 'Email, password, and full name required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return Response.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Create new user
    // In production, use bcrypt to hash password
    const newUser = {
      email,
      password, // NOT SECURE - USE BCRYPT IN PRODUCTION
      full_name: fullName,
      role: role || 'customer',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser);

    // Create user profile
    const profile = {
      user_id: result.insertedId.toString(),
      email,
      full_name: fullName,
      role: role || 'customer',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection('profiles').insertOne(profile);

    return Response.json({
      user: {
        id: result.insertedId.toString(),
        email,
        full_name: fullName,
        role: role || 'customer',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[API] signup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
