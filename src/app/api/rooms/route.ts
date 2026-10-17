import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const backendUrl = process.env.INTERNAL_SOCKET_URL || 'http://127.0.0.1:4000';
    const res = await fetch(`${backendUrl}/api/rooms`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ success: true, rooms: data.rooms || [] });
    }

    return NextResponse.json({ success: true, rooms: [] });
  } catch (error: any) {
    console.error('Fetch rooms proxy error:', error.message);
    return NextResponse.json({ success: true, rooms: [] });
  }
}
