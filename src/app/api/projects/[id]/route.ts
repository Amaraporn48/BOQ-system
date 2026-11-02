import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        customer: true,
        locations: true,
        documents: {
          orderBy: { updatedAt: 'desc' },
          include: {
            createdBy: { select: { name: true } },
            revisions: {
              orderBy: { revisionNumber: 'desc' },
              take: 1,
              select: {
                revisionCode: true,
                grandTotal: true,
                documentDate: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'ไม่พบโครงการ' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลโครงการ' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const project = await prisma.project.update({
      where: { id },
      data: {
        projectCode: body.projectCode !== undefined ? body.projectCode.trim() : undefined,
        name: body.name ? body.name.trim() : undefined,
        customerId: body.customerId !== undefined ? body.customerId : undefined,
        workingLocation: body.workingLocation !== undefined ? body.workingLocation : undefined,
        projectAddress: body.projectAddress !== undefined ? body.projectAddress : undefined,
        coordinatorName: body.coordinatorName !== undefined ? body.coordinatorName : undefined,
        coordinatorPhone: body.coordinatorPhone !== undefined ? body.coordinatorPhone : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        status: body.status !== undefined ? body.status : undefined,
      },
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกโครงการ' }, { status: 500 });
  }
}
