import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromRequest, verifyToken, signToken, setAuthCookie } from '@/lib/auth';

const ALLOWED_AVATARS = [
  'avatar_1', 'avatar_2', 'avatar_3', 'avatar_4',
  'avatar_5', 'avatar_6', 'avatar_7', 'avatar_8'
];

export async function PATCH(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: 'Harus login untuk mengubah profil.' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Sesi tidak valid.' }, { status: 401 });
    }

    const body = await req.json();
    const { nickname, avatar } = body;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const updateData: { nickname?: string; avatar?: string; nicknameLastChanged?: Date } = {};

    // Validate Nickname
    if (nickname !== undefined) {
      if (typeof nickname !== 'string') {
        return NextResponse.json({ error: 'Nickname tidak valid.' }, { status: 400 });
      }

      const cleanNickname = nickname.trim();

      if (cleanNickname.length < 3 || cleanNickname.length > 20) {
        return NextResponse.json(
          { error: 'Panjang nickname harus antara 3 hingga 20 karakter.' },
          { status: 400 }
        );
      }

      // Valid characters: alphanumeric, spaces, dashes, underscores
      if (!/^[a-zA-Z0-9 _-]+$/.test(cleanNickname)) {
        return NextResponse.json(
          { error: 'Nickname hanya boleh berisi huruf, angka, spasi, dash, dan underscore.' },
          { status: 400 }
        );
      }

      // Prevent reserved names or admin impersonation
      const prohibitedPrefixes = ['admin', 'system', 'moderator', 'server', 'official'];
      const lower = cleanNickname.toLowerCase();
      if (prohibitedPrefixes.some(p => lower.startsWith(p) || lower === p)) {
        return NextResponse.json(
          { error: 'Nickname tersebut dilindungi sistem atau berisiko penyamaran.' },
          { status: 400 }
        );
      }

      // Check change frequency (e.g., minimum 10 seconds between changes to prevent spam)
      if (user.nicknameLastChanged) {
        const diffMs = Date.now() - new Date(user.nicknameLastChanged).getTime();
        if (diffMs < 10000 && cleanNickname !== user.nickname) {
          const waitSecs = Math.ceil((10000 - diffMs) / 1000);
          return NextResponse.json(
            { error: `Tunggu ${waitSecs} detik sebelum mengganti nickname kembali.` },
            { status: 429 }
          );
        }
      }

      updateData.nickname = cleanNickname;
      updateData.nicknameLastChanged = new Date();
    }

    // Validate Avatar
    if (avatar !== undefined) {
      if (!ALLOWED_AVATARS.includes(avatar)) {
        return NextResponse.json({ error: 'Pilihan avatar tidak valid.' }, { status: 400 });
      }
      updateData.avatar = avatar;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
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
      },
    });

    // Re-issue updated token
    const newToken = signToken({
      userId: updatedUser.id,
      username: updatedUser.username,
      nickname: updatedUser.nickname,
      avatar: updatedUser.avatar,
    });

    const res = NextResponse.json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      user: updatedUser,
      token: newToken,
    });

    setAuthCookie(res, newToken);
    return res;
  } catch (error: any) {
    console.error('Update Profile API Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat memperbarui profil.' }, { status: 500 });
  }
}
