import bcrypt from 'bcryptjs';
import { mongoService } from '@/lib/mongoService';
import { getDatabase } from '@/lib/mongodb';

export async function POST(request) {
  try {
    console.log('[API] signup route called');
    const { email, password, fullName, role } = await request.json();
    console.log('[API] signup data received:', { email, fullName, role });

    if (!email || !password || !fullName) {
      console.warn('[API] signup validation failed: missing fields');
      return Response.json(
        { error: 'Email, password, and full name required' },
        { status: 400 }
      );
    }

    console.log('[API] connecting to database...');
    const db = await getDatabase();
    console.log('[API] database connected successfully');

    // Check if user already exists
    console.log('[API] checking if user exists:', email);
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      console.warn('[API] user already exists:', email);
      return Response.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password with bcrypt (10 salt rounds)
    console.log('[API] hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('[API] password hashed successfully');

    // Create new user
    console.log('[API] creating user document...');
    const newUser = {
      email,
      password: hashedPassword,
      full_name: fullName,
      role: role || 'customer',
      created_at: new Date(),
      updated_at: new Date(),
    };

    console.log('[API] inserting user into database...');
    const result = await db.collection('users').insertOne(newUser);
    console.log('[API] user created with ID:', result.insertedId.toString());

    // Create user profile
    console.log('[API] creating user profile...');
    const profile = {
      user_id: result.insertedId.toString(),
      email,
      full_name: fullName,
      role: role || 'customer',
      created_at: new Date(),
      updated_at: new Date(),
    };

    console.log('[API] inserting profile into database...');
    await db.collection('profiles').insertOne(profile);
    console.log('[API] profile created successfully');

    console.log('[API] signup completed successfully');

    return Response.json({
      user: {
        id: result.insertedId.toString(),
        email,
        full_name: fullName,
        role: role || 'customer',
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[API] signup error:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    
    // Check for specific MongoDB errors
    if (error?.code === 'ECONNREFUSED') {
      console.error('[API] MongoDB connection refused - check your connection string');
      return Response.json(
        { error: 'Cannot connect to MongoDB. Check your MONGODB_URI in .env.local' },
        { status: 500 }
      );
    }
    
    if (error?.message?.includes('authentication failed')) {
      console.error('[API] MongoDB authentication failed');
      return Response.json(
        { error: 'MongoDB authentication failed. Check your credentials.' },
        { status: 500 }
      );
    }
    
    if (error?.message?.includes('ns does not exist')) {
      console.error('[API] Collections not initialized');
      return Response.json(
        { error: 'Database collections not initialized. Run: node scripts/init-collections.mjs' },
        { status: 500 }
      );
    }
    
    console.error('[API] Unexpected error:', error);
    return Response.json(
      { error: error?.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}
