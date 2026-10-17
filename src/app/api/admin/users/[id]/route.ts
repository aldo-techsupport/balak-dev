import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminFromRequest, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = verifyAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak. Diperlukan role admin.' }, { status: 403 });
    }

    const { id } = params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        matchParticipants: {
          take: 10,
          orderBy: { match: { createdAt: 'desc' } },
          include: { match: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const { password, ...safeUser } = user;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error('Admin user detail GET error:', error);
    return NextResponse.json({ error: 'Gagal mengambil detail pengguna.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = verifyAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak. Diperlukan role admin.' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();

    const dataToUpdate: any = {};

    // Rank editing
    if (body.rankTier !== undefined) {
      dataToUpdate.rankTier = body.rankTier.toUpperCase().trim();
    }
    if (body.rankDivision !== undefined) {
      dataToUpdate.rankDivision = body.rankDivision.trim();
    }
    if (body.rankStars !== undefined) {
      dataToUpdate.rankStars = Math.max(0, parseInt(body.rankStars, 10) || 0);
    }
    if (body.rankScore !== undefined) {
      dataToUpdate.rankScore = Math.max(0, parseInt(body.rankScore, 10) || 0);
    }

    // Profile & Meta editing
    if (body.nickname !== undefined && body.nickname.trim()) {
      dataToUpdate.nickname = body.nickname.trim();
    }
    if (body.avatar !== undefined) {
      dataToUpdate.avatar = body.avatar;
    }
    if (body.role !== undefined) {
      // Prevent demoting last admin or self carelessly if dangerous
      dataToUpdate.role = body.role === 'admin' ? 'admin' : 'user';
    }
    if (body.isBanned !== undefined) {
      if (id === admin.userId && body.isBanned === true) {
        return NextResponse.json({ error: 'Tidak dapat menonaktifkan akun sendiri.' }, { status: 400 });
      }
      dataToUpdate.isBanned = Boolean(body.isBanned);
    }

    // Password reset by admin
    if (body.password && body.password.trim()) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: 'Password baru minimal 6 karakter.' }, { status: 400 });
      }
      dataToUpdate.password = await hashPassword(body.password.trim());
    }

    // Stats override if requested
    if (body.totalGames !== undefined) {
      dataToUpdate.totalGames = Math.max(0, parseInt(body.totalGames, 10) || 0);
    }
    if (body.wins !== undefined) {
      dataToUpdate.wins = Math.max(0, parseInt(body.wins, 10) || 0);
    }
    if (body.losses !== undefined) {
      dataToUpdate.losses = Math.max(0, parseInt(body.losses, 10) || 0);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
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
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Data pengguna dan rank berhasil diperbarui!',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Admin user PATCH error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui pengguna.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = verifyAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Akses ditolak. Diperlukan role admin.' }, { status: 403 });
    }

    const { id } = params;
    if (id === admin.userId) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun admin Anda sendiri.' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Akun pengguna berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('Admin user DELETE error:', error);
    return NextResponse.json({ error: 'Gagal menghapus pengguna.' }, { status: 500 });
  }
}
