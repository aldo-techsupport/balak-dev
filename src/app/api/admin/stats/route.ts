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

    const [totalUsers, bannedUsers, totalMatches, usersByTier] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.matchHistory.count(),
      prisma.user.groupBy({
        by: ['rankTier'],
        _count: { id: true },
      }),
    ]);

    // Live rooms from engine
    let liveRooms: any[] = [];
    try {
      const backendUrl = process.env.INTERNAL_SOCKET_URL || 'http://127.0.0.1:4000';
      const roomsRes = await fetch(`${backendUrl}/api/admin/rooms`, { cache: 'no-store' });
      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        liveRooms = roomsData.rooms || [];
      }
    } catch (err: any) {
      console.error('Failed to fetch live rooms for admin stats:', err.message);
    }

    // Tier distribution object
    const tierCounts: Record<string, number> = {
      WARRIOR: 0,
      ELITE: 0,
      MASTER: 0,
      GRANDMASTER: 0,
      EPIC: 0,
      LEGEND: 0,
      MYTHIC: 0,
    };
    usersByTier.forEach((group) => {
      const tier = group.rankTier?.toUpperCase() || 'WARRIOR';
      tierCounts[tier] = group._count.id;
    });

    const activeRoomsCount = liveRooms.length;
    const playingRoomsCount = liveRooms.filter((r) => r.status === 'PLAYING').length;
    const activePlayersInRooms = liveRooms.reduce((acc, r) => acc + (r.playerCount || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        bannedUsers,
        totalMatches,
        activeRoomsCount,
        playingRoomsCount,
        activePlayersInRooms,
        tierCounts,
        serverTime: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Gagal mengambil statistik admin.' }, { status: 500 });
  }
}
