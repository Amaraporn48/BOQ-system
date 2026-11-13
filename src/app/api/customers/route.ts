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
    const q = searchParams.get('q')?.trim() || '';

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q } },
        { taxId: { contains: q } },
        { contactPerson: { contains: q } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { documents: true, projects: true } },
      },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Fetch customers error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลลูกค้า' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, taxId, address, contactPerson, phone, email, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อลูกค้า / บริษัท' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const existingName = await prisma.customer.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
      },
    });
    if (existingName) {
      return NextResponse.json(
        { error: `มีรายชื่อลูกค้า / โรงพยาบาล "${trimmedName}" ในระบบแล้ว (รหัส: ${existingName.code})` },
        { status: 400 }
      );
    }

    let custCode = code ? code.trim() : '';
    if (!custCode) {
      const count = await prisma.customer.count();
      custCode = `CUST-${String(count + 1).padStart(3, '0')}`;
    }

    const customer = await prisma.customer.create({
      data: {
        code: custCode,
        name: name.trim(),
        taxId: taxId ? taxId.trim() : null,
        address: address ? address.trim() : null,
        contactPerson: contactPerson ? contactPerson.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        notes: notes ? notes.trim() : null,
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างลูกค้า' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, taxId, address, contactPerson, phone, email, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ระบุ ID ลูกค้า' }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อลูกค้า / โรงพยาบาล' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const existingName = await prisma.customer.findFirst({
      where: {
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
        NOT: { id },
      },
    });
    if (existingName) {
      return NextResponse.json(
        { error: `มีรายชื่อลูกค้า / โรงพยาบาล "${trimmedName}" ในระบบแล้ว (รหัส: ${existingName.code})` },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: name.trim(),
        taxId: taxId !== undefined ? (taxId ? taxId.trim() : null) : undefined,
        address: address !== undefined ? (address ? address.trim() : null) : undefined,
        contactPerson: contactPerson !== undefined ? (contactPerson ? contactPerson.trim() : null) : undefined,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
        email: email !== undefined ? (email ? email.trim() : null) : undefined,
        notes: notes !== undefined ? (notes ? notes.trim() : null) : undefined,
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการแก้ไขลูกค้า' }, { status: 500 });
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
      return NextResponse.json({ error: 'ระบุ ID ลูกค้า' }, { status: 400 });
    }

    await prisma.document.updateMany({
      where: { customerId: id },
      data: { customerId: null },
    });

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบลูกค้า' }, { status: 500 });
  }
}
