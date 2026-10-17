import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken, setAuthCookie, checkRateLimit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`login_${ip}`, 8, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login gagal. Mohon tunggu 1 menit.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { identifier, password } = body; // identifier = username or email

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Username/Email dan password wajib diisi.' }, { status: 400 });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanIdentifier }, { email: cleanIdentifier }],
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Username/Email atau password salah.' }, { status: 401 });
    }

    // Compare password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Username/Email atau password salah.' }, { status: 401 });
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: 'Akun ini telah dinonaktifkan oleh administrator.' },
        { status: 403 }
      );
    }

    // Sign session token
    const token = signToken({
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
    });

    const res = NextResponse.json({
      success: true,
      message: 'Login berhasil!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
        isBanned: user.isBanned,
        totalGames: user.totalGames,
        wins: user.wins,
        losses: user.losses,
        soloGames: user.soloGames,
        soloWins: user.soloWins,
        teamGames: user.teamGames,
        teamWins: user.teamWins,
        rankTier: user.rankTier,
        rankDivision: user.rankDivision,
        rankStars: user.rankStars,
        rankScore: user.rankScore,
      },
    });

    setAuthCookie(res, token);
    return res;
  } catch (error: any) {
    console.error('Login API Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server saat login.' }, { status: 500 });
  }
}
