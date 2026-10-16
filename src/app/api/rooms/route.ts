import { NextResponse } from 'next/server';
import { roomManager } from '../../../../server/roomManager';

export async function GET() {
  try {
    const rooms = roomManager.getPublicRooms();
    return NextResponse.json({ success: true, rooms });
  } catch (error: any) {
    console.error('Fetch rooms error:', error);
    return NextResponse.json({ error: 'Gagal memuat daftar room.' }, { status: 500 });
  }
}
