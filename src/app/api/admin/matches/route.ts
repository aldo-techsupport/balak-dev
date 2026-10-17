import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak. Diperlukan role admin.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));
    const mode = searchParams.get('mode') || '';

    const where: any = {};
    if (mode && mode !== 'ALL') {
      where.gameMode = mode;
    }

    const matches = await prisma.matchHistory.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        participants: {
          select: {
            id: true,
            userId: true,
            userNicknameSnapshot: true,
            userAvatarSnapshot: true,
            seatIndex: true,
            team: true,
            isWinner: true,
            remainingPips: true,
            remainingTiles: true,
            rankSnapshot: true,
            rankStarsChange: true,
          },
          orderBy: { seatIndex: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, matches });
  } catch (error: any) {
    console.error('Admin matches GET error:', error);
    return NextResponse.json({ error: 'Gagal memuat riwayat pertandingan.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = verifyAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak. Diperlukan role admin.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID pertandingan wajib diberikan.' }, { status: 400 });
    }

    await prisma.matchHistory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Riwayat pertandingan berhasil dihapus.' });
  } catch (error: any) {
    console.error('Admin matches DELETE error:', error);
    return NextResponse.json({ error: 'Gagal menghapus riwayat pertandingan.' }, { status: 500 });
  }
}
