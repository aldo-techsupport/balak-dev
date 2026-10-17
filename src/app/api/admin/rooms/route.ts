import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak. Diperlukan role admin.' }, { status: 403 });
    }

    const backendUrl = process.env.INTERNAL_SOCKET_URL || 'http://127.0.0.1:4000';
    const res = await fetch(`${backendUrl}/api/admin/rooms`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ success: true, rooms: data.rooms || [] });
    }

    return NextResponse.json({ success: true, rooms: [] });
  } catch (error: any) {
    console.error('Admin rooms GET error:', error);
    return NextResponse.json({ error: 'Gagal memuat data meja aktif.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = verifyAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak. Diperlukan role admin.' }, { status: 403 });
    }

    const { roomCode } = await req.json();
    if (!roomCode) {
      return NextResponse.json({ error: 'Kode room wajib diisi.' }, { status: 400 });
    }

    const backendUrl = process.env.INTERNAL_SOCKET_URL || 'http://127.0.0.1:4000';
    const res = await fetch(`${backendUrl}/api/admin/rooms/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode }),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ success: true, message: `Meja ${roomCode} berhasil ditutup.`, data });
    }

    return NextResponse.json({ error: 'Gagal menutup meja dari engine server.' }, { status: 500 });
  } catch (error: any) {
    console.error('Admin rooms POST error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat menutup meja.' }, { status: 500 });
  }
}
