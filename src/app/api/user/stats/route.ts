import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromRequest, verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Harus login untuk melihat statistik.' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Sesi tidak valid.' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        totalGames: true,
        wins: true,
        losses: true,
        soloGames: true,
        soloWins: true,
        teamGames: true,
        teamWins: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    // Fetch user's match history with participants
    const matchHistory = await prisma.matchParticipant.findMany({
      where: { userId: payload.userId },
      orderBy: { match: { createdAt: 'desc' } },
      take: 20,
      include: {
        match: {
          include: {
            participants: true,
          },
        },
      },
    });

    const formattedHistory = matchHistory.map((item) => {
      const match = item.match;
      return {
        id: match.id,
        roomCode: match.roomCode,
        gameMode: match.gameMode,
        playerCount: match.playerCount,
        winnerNickname: match.winnerNickname,
        winningTeam: match.winningTeam,
        endReason: match.endReason,
        createdAt: match.createdAt,
        mySeat: item.seatIndex,
        myTeam: item.team,
        myRank: item.rank,
        isWinner: item.isWinner,
        remainingPips: item.remainingPips,
        remainingTiles: JSON.parse(item.remainingTiles || '[]'),
        participants: match.participants.map((p) => ({
          userId: p.userId,
          nickname: p.userNicknameSnapshot,
          avatar: p.userAvatarSnapshot,
          seatIndex: p.seatIndex,
          team: p.team,
          rank: p.rank,
          isWinner: p.isWinner,
          remainingPips: p.remainingPips,
        })),
      };
    });

    const winRate = user.totalGames > 0 ? Math.round((user.wins / user.totalGames) * 100) : 0;
    const soloWinRate = user.soloGames > 0 ? Math.round((user.soloWins / user.soloGames) * 100) : 0;
    const teamWinRate = user.teamGames > 0 ? Math.round((user.teamWins / user.teamGames) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        ...user,
        winRate,
        soloWinRate,
        teamWinRate,
        history: formattedHistory,
      },
    });
  } catch (error: any) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat memuat statistik.' }, { status: 500 });
  }
}
