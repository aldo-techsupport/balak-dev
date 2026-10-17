import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getUserId(req: NextRequest): string | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId || null;
}

// GET: Ambil daftar teman
export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Harus login terlebih dahulu.' }, { status: 401 });
    }

    const friendships = await prisma.friend.findMany({
      where: { userId },
      include: {
        friend: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const friends = friendships.map((f) => ({
      friendshipId: f.id,
      id: f.friend.id,
      username: f.friend.username,
      nickname: f.friend.nickname,
      avatar: f.friend.avatar,
      rankTier: f.friend.rankTier,
      rankDivision: f.friend.rankDivision,
      rankStars: f.friend.rankStars,
      totalGames: f.friend.totalGames,
      wins: f.friend.wins,
      createdAt: f.createdAt,
    }));

    return NextResponse.json({ success: true, friends });
  } catch (err: any) {
    console.error('GET /api/friends error:', err);
    return NextResponse.json({ error: 'Gagal mengambil daftar teman.' }, { status: 500 });
  }
}

// POST: Tambah teman (bisa pakai username atau friendId)
export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Harus login terlebih dahulu.' }, { status: 401 });
    }

    const body = await req.json();
    const { friendUsername, friendId: directFriendId } = body || {};

    let targetUser = null;
    if (directFriendId) {
      targetUser = await prisma.user.findUnique({
        where: { id: directFriendId },
        select: { id: true, username: true, nickname: true, avatar: true },
      });
    } else if (friendUsername) {
      targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: friendUsername.trim(), mode: 'insensitive' } },
            { nickname: { equals: friendUsername.trim(), mode: 'insensitive' } },
          ],
        },
        select: { id: true, username: true, nickname: true, avatar: true },
      });
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Pemain tidak ditemukan.' }, { status: 404 });
    }

    if (targetUser.id === userId) {
      return NextResponse.json({ error: 'Tidak dapat menambahkan diri sendiri sebagai teman.' }, { status: 400 });
    }

    // Cek apakah sudah berteman
    const existing = await prisma.friend.findUnique({
      where: {
        userId_friendId: {
          userId,
          friendId: targetUser.id,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Pemain ini sudah ada di daftar teman Anda.' }, { status: 400 });
    }

    // Tambah teman (dan reciprocate agar kedua belah pihak saling berteman)
    await prisma.friend.create({
      data: {
        userId,
        friendId: targetUser.id,
      },
    });

    // Cek sisi sebaliknya juga
    const reverse = await prisma.friend.findUnique({
      where: {
        userId_friendId: {
          userId: targetUser.id,
          friendId: userId,
        },
      },
    });
    if (!reverse) {
      await prisma.friend.create({
        data: {
          userId: targetUser.id,
          friendId: userId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${targetUser.nickname} berhasil ditambahkan sebagai teman!`,
      friend: targetUser,
    });
  } catch (err: any) {
    console.error('POST /api/friends error:', err);
    return NextResponse.json({ error: 'Gagal menambahkan teman.' }, { status: 500 });
  }
}

// DELETE: Hapus teman
export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Harus login terlebih dahulu.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const friendId = searchParams.get('friendId');

    if (!friendId) {
      return NextResponse.json({ error: 'friendId wajib diisi.' }, { status: 400 });
    }

    await prisma.friend.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    return NextResponse.json({ success: true, message: 'Teman berhasil dihapus.' });
  } catch (err: any) {
    console.error('DELETE /api/friends error:', err);
    return NextResponse.json({ error: 'Gagal menghapus teman.' }, { status: 500 });
  }
}
