import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.documentTemplate.findMany({
      orderBy: [{ isSystem: 'desc' }, { category: 'asc' }],
      include: {
        createdBy: { select: { name: true } },
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Fetch templates error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลด Template' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, category, defaultItemsJson } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อ Template' }, { status: 400 });
    }

    const template = await prisma.documentTemplate.create({
      data: {
        name: name.trim(),
        description: description || null,
        category: category || 'ทั่วไป',
        defaultItemsJson: typeof defaultItemsJson === 'string' ? defaultItemsJson : JSON.stringify(defaultItemsJson || []),
        createdById: currentUser.userId,
        isSystem: currentUser.role === 'admin' ? Boolean(body.isSystem) : false,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึก Template' }, { status: 500 });
  }
}
