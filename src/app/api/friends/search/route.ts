import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Harus login.' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Sesi tidak valid.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: payload.userId } },
          { isBanned: false },
          {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { nickname: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        rankTier: true,
        rankDivision: true,
        rankStars: true,
        totalGames: true,
        wins: true,
      },
      take: 15,
    });

    // Check which ones are already friends
    const existingFriends = await prisma.friend.findMany({
      where: {
        userId: payload.userId,
        friendId: { in: users.map((u) => u.id) },
      },
      select: { friendId: true },
    });
    const friendIdSet = new Set(existingFriends.map((f) => f.friendId));

    const results = users.map((u) => ({
      ...u,
      isFriend: friendIdSet.has(u.id),
    }));

    return NextResponse.json({ success: true, users: results });
  } catch (err: any) {
    console.error('GET /api/friends/search error:', err);
    return NextResponse.json({ error: 'Gagal mencari pengguna.' }, { status: 500 });
  }
}
