import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken, setAuthCookie, checkRateLimit } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`register_${ip}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan pendaftaran. Silakan coba lagi nanti.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { username, email, password, nickname } = body;

    // 1. Validation
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username wajib diisi.' }, { status: 400 });
    }
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: 'Username harus 3-20 karakter dan hanya boleh berisi huruf, angka, dan underscore.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email wajib diisi.' }, { status: 400 });
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
    }

    // Nickname validation (3-20 characters)
    let cleanNickname = (nickname && typeof nickname === 'string' ? nickname.trim() : cleanUsername);
    if (cleanNickname.length < 3 || cleanNickname.length > 20) {
      cleanNickname = cleanUsername.substring(0, 20);
    }
    // Filter prohibited characters
    cleanNickname = cleanNickname.replace(/[<>{}\\]/g, '');

    // 2. Check duplicate username or email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: cleanUsername }, { email: cleanEmail }],
      },
    });

    if (existing) {
      if (existing.username === cleanUsername) {
        return NextResponse.json({ error: 'Username sudah digunakan oleh pemain lain.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Email sudah terdaftar. Silakan login.' }, { status: 409 });
    }

    // 3. Hash password & create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: cleanUsername,
        email: cleanEmail,
        password: hashedPassword,
        nickname: cleanNickname,
        avatar: 'avatar_1',
      },
    });

    // 4. Create token & response
    const token = signToken({
      userId: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
    });

    const res = NextResponse.json({
      success: true,
      message: 'Registrasi berhasil!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
        totalGames: user.totalGames,
        wins: user.wins,
        losses: user.losses,
        soloGames: user.soloGames,
        soloWins: user.soloWins,
        teamGames: user.teamGames,
        teamWins: user.teamWins,
      },
    });

    setAuthCookie(res, token);
    return res;
  } catch (error: any) {
    console.error('Register API Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server saat pendaftaran.' }, { status: 500 });
  }
}
