export async function POST(request) {
  try {
    // Logout is handled on the client by clearing localStorage
    // This endpoint exists for consistency
    return Response.json({ success: true });
  } catch (error) {
    console.error('[API] signout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
