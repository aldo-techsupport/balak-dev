import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminFromRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = verifyAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak. Diperlukan role admin.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const tier = searchParams.get('tier')?.trim().toUpperCase() || '';
    const role = searchParams.get('role')?.trim() || '';

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tier && tier !== 'ALL') {
      where.rankTier = tier;
    }

    if (role && role !== 'ALL') {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatar: true,
        role: true,
        isBanned: true,
        rankTier: true,
        rankDivision: true,
        rankStars: true,
        rankScore: true,
        totalGames: true,
        wins: true,
        losses: true,
        soloGames: true,
        soloWins: true,
        teamGames: true,
        teamWins: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ rankScore: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Gagal memuat data pengguna.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = verifyAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak. Diperlukan role admin.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      username,
      email,
      password,
      nickname,
      avatar = 'avatar_1',
      role = 'user',
      rankTier = 'WARRIOR',
      rankDivision = 'III',
      rankStars = 0,
      rankScore = 0,
    } = body;

    if (!username || !email || !password || !nickname) {
      return NextResponse.json(
        { error: 'Username, email, password, dan nickname wajib diisi.' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Username atau email sudah digunakan.' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        nickname: nickname.trim(),
        avatar,
        role: role === 'admin' ? 'admin' : 'user',
        rankTier: rankTier.toUpperCase(),
        rankDivision,
        rankStars: Math.max(0, parseInt(rankStars, 10) || 0),
        rankScore: Math.max(0, parseInt(rankScore, 10) || 0),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengguna baru berhasil dibuat!',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        nickname: newUser.nickname,
        role: newUser.role,
        rankTier: newUser.rankTier,
        rankDivision: newUser.rankDivision,
        rankStars: newUser.rankStars,
      },
    });
  } catch (error: any) {
    console.error('Admin users POST error:', error);
    return NextResponse.json({ error: 'Gagal membuat pengguna baru.' }, { status: 500 });
  }
}
