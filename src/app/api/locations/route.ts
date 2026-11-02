import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const q = searchParams.get('q')?.trim() || '';

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { address: { contains: q } },
      ];
    }

    const locations = await prisma.location.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
        _count: { select: { documents: true } },
      },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Fetch locations error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดสถานที่' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, address, notes, projectId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อสถานที่' }, { status: 400 });
    }

    const location = await prisma.location.create({
      data: {
        name: name.trim(),
        address: address ? address.trim() : null,
        notes: notes ? notes.trim() : null,
        projectId: projectId || null,
      },
    });

    // Also ensure a Customer record exists so it can be used interchangeably as Customer/Site
    const existingCust = await prisma.customer.findFirst({
      where: { name: name.trim() },
    });
    if (!existingCust) {
      const count = await prisma.customer.count();
      await prisma.customer.create({
        data: {
          code: `CUST-${String(count + 1).padStart(3, '0')}`,
          name: name.trim(),
          address: address ? address.trim() : null,
          notes: notes ? notes.trim() : null,
        },
      });
    }

    return NextResponse.json({ success: true, location });
  } catch (error) {
    console.error('Create location error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างสถานที่' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, address, notes, projectId } = body;

    if (!id) {
      return NextResponse.json({ error: 'ระบุ ID สถานที่' }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อสถานที่' }, { status: 400 });
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
        name: name.trim(),
        address: address !== undefined ? (address ? address.trim() : null) : undefined,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
        projectId: projectId !== undefined ? (projectId || null) : undefined,
      },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
        _count: { select: { documents: true } },
      },
    });

    return NextResponse.json({ success: true, location });
  } catch (error) {
    console.error('Update location error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการแก้ไขสถานที่' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ระบุ ID สถานที่' }, { status: 400 });
    }

    await prisma.document.updateMany({
      where: { locationId: id },
      data: { locationId: null },
    });

    await prisma.location.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete location error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบสถานที่' }, { status: 500 });
  }
}
