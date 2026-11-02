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
    const year = searchParams.get('year') || '';
    const location = searchParams.get('location')?.trim() || '';
    const status = searchParams.get('status') || '';

    const where: any = {};
    if (q) {
      where.OR = [
        { name: { contains: q } },
        { projectCode: { contains: q } },
        { workingLocation: { contains: q } },
        { customer: { name: { contains: q } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (location) {
      const locConditions = [
        { workingLocation: { contains: location } },
        { customer: { name: { contains: location } } },
      ];
      if (where.OR) {
        where.AND = [...(where.AND || []), { OR: locConditions }];
      } else {
        where.OR = locConditions;
      }
    }

    if (year) {
      const yNum = Number(year);
      if (yNum) {
        const startOfYear = new Date(`${yNum}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${yNum + 1}-01-01T00:00:00.000Z`);
        const bYear2 = String(yNum + 543).slice(-2);
        const cYear2 = String(yNum).slice(-2);

        const yearConditions: any[] = [
          { projectYear: yNum },
          { createdAt: { gte: startOfYear, lt: endOfYear } },
          { projectCode: { contains: String(yNum) } },
          { projectCode: { contains: bYear2 } },
          { projectCode: { contains: cYear2 } },
        ];

        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: yearConditions }];
          delete where.OR;
        } else {
          where.OR = yearConditions;
        }
      }
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        locations: true,
        _count: { select: { documents: true } },
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Fetch projects error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดโครงการ' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectCode,
      name,
      customerId,
      workingLocation,
      projectAddress,
      coordinatorName,
      coordinatorPhone,
      notes,
      projectYear,
      status = 'Active',
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อโครงการ' }, { status: 400 });
    }

    const assignedYear = projectYear ? Number(projectYear) : new Date().getFullYear();

    let code = projectCode ? projectCode.trim() : '';
    if (!code) {
      const count = await prisma.project.count();
      code = `PRJ-${assignedYear}-${String(count + 1).padStart(3, '0')}`;
    }

    const project = await prisma.project.create({
      data: {
        projectCode: code,
        name: name.trim(),
        customerId: customerId || null,
        workingLocation: workingLocation ? workingLocation.trim() : null,
        projectAddress: projectAddress ? projectAddress.trim() : null,
        coordinatorName: coordinatorName ? coordinatorName.trim() : null,
        coordinatorPhone: coordinatorPhone ? coordinatorPhone.trim() : null,
        notes: notes ? notes.trim() : null,
        projectYear: assignedYear,
        status,
      },
    });

    // If workingLocation was given, check if Location exists or create one
    if (workingLocation && workingLocation.trim()) {
      const locTrim = workingLocation.trim();
      const existingLoc = await prisma.location.findFirst({
        where: { name: locTrim },
      });
      if (!existingLoc) {
        await prisma.location.create({
          data: {
            name: locTrim,
            address: projectAddress ? projectAddress.trim() : null,
            projectId: project.id,
          },
        });
      }
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างโครงการ' }, { status: 500 });
  }
}
