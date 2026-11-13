import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword, comparePassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { createdDocuments: true } },
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดผู้ใช้งาน' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะ Admin เท่านั้นที่สามารถเพิ่มผู้ใช้ได้' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, email, name, role = 'staff' } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลผู้ใช้ให้ครบถ้วน' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.trim() }, { email: email.trim() }],
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim(),
        passwordHash,
        name: name.trim(),
        role: role === 'admin' ? 'admin' : 'staff',
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' }, { status: 401 });
    }

    const body = await request.json();
    const { id, isActive, role, name, username, email, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'ระบุ ID ผู้ใช้' }, { status: 400 });
    }

    const isSelf = currentUser.userId === id;
    const isAdmin = currentUser.role === 'admin';

    // Target user check
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    // Only admin can modify other users' accounts; staff can only modify their own profile
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขบัญชีของผู้ใช้อื่น' }, { status: 403 });
    }

    const data: any = {};
    if (typeof isActive === 'boolean' && isAdmin) data.isActive = isActive;
    if (role && ['admin', 'staff'].includes(role) && isAdmin) data.role = role;
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: 'กรุณาระบุชื่อ-นามสกุล' }, { status: 400 });
      }
      data.name = name.trim();
    }

    if (username !== undefined) {
      const cleanUsername = username.trim().replace(/^@/, '');
      if (!cleanUsername) {
        return NextResponse.json({ error: 'กรุณาระบุชื่อผู้ใช้งาน (Username)' }, { status: 400 });
      }
      const existingUser = await prisma.user.findFirst({
        where: {
          username: cleanUsername,
          NOT: { id },
        },
      });
      if (existingUser) {
        return NextResponse.json({ error: 'ชื่อผู้ใช้งาน (Username) นี้มีอยู่ในระบบแล้ว' }, { status: 400 });
      }
      data.username = cleanUsername;
    }

    if (email !== undefined && email.trim()) {
      const cleanEmail = email.trim();
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: cleanEmail,
          NOT: { id },
        },
      });
      if (existingEmail) {
        return NextResponse.json({ error: 'อีเมลนี้มีอยู่ในระบบแล้ว' }, { status: 400 });
      }
      data.email = cleanEmail;
    }

    if (password && password.trim()) {
      // If user is changing their own password, verify current password first
      if (isSelf) {
        const currentPassword = body.currentPassword ? String(body.currentPassword).trim() : '';
        if (!currentPassword) {
          return NextResponse.json({ error: 'กรุณาระบุรหัสผ่านเดิมเพื่อยืนยันการเปลี่ยนรหัสผ่าน' }, { status: 400 });
        }
        const isCurrentValid = await comparePassword(currentPassword, targetUser.passwordHash);
        if (!isCurrentValid) {
          return NextResponse.json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' }, { status: 400 });
        }
      }
      data.passwordHash = await hashPassword(password.trim());
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (isSelf) {
      const { createSessionToken, COOKIE_NAME } = await import('@/lib/auth');
      const { cookies } = await import('next/headers');
      const token = await createSessionToken({
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
      });
      cookies().set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการแก้ไขผู้ใช้' }, { status: 500 });
  }
}
