import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Tidak ada sesi login aktif.' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Sesi kedaluwarsa atau tidak valid.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatar: true,
        totalGames: true,
        wins: true,
        losses: true,
        soloGames: true,
        soloWins: true,
        teamGames: true,
        teamWins: true,
        rankTier: true,
        rankDivision: true,
        rankStars: true,
        rankScore: true,
        role: true,
        isBanned: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
      token, // Return token so frontend can use it for socket handshake
    });
  } catch (error: any) {
    console.error('Me API Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat memeriksa sesi.' }, { status: 500 });
  }
}
