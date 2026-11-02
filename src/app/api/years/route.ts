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

    // 1. Get custom registered years
    const customYears = await prisma.fiscalYear.findMany({
      orderBy: { year: 'desc' },
    });

    // 2. Also extract years from existing projects
    const projects = await prisma.project.findMany({
      select: { createdAt: true, projectYear: true, projectCode: true },
    });

    const projectYears = projects.flatMap((p) => {
      const list: number[] = [];
      if (p.projectYear) list.push(p.projectYear);
      if (p.createdAt) list.push(new Date(p.createdAt).getFullYear());
      return list;
    });

    // Always include current year
    const allYearNumbers = Array.from(
      new Set([
        new Date().getFullYear(),
        ...customYears.map((cy) => cy.year),
        ...projectYears,
      ])
    ).sort((a, b) => b - a);

    const result = allYearNumbers.map((y) => {
      const found = customYears.find((cy) => cy.year === y);
      return {
        year: y,
        buddhistYear: y + 543,
        label: found?.label || `ปี ${y} (พ.ศ. ${y + 543})`,
        isCustom: !!found,
      };
    });

    return NextResponse.json({ years: result });
  } catch (error) {
    console.error('Fetch years error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดปี' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    let { year, label } = body;

    let num = Number(year);
    if (!num || isNaN(num)) {
      return NextResponse.json({ error: 'กรุณาระบุปีให้ถูกต้อง' }, { status: 400 });
    }

    // If user entered Thai Buddhist year (e.g. 2567, 2568, 2569)
    if (num > 2400) {
      num = num - 543;
    }

    if (num < 1900 || num > 2200) {
      return NextResponse.json({ error: 'ปีต้องอยู่ระหว่าง ค.ศ. 1900 - 2200' }, { status: 400 });
    }

    const saved = await prisma.fiscalYear.upsert({
      where: { year: num },
      create: {
        year: num,
        label: label?.trim() || `ปี ${num} (พ.ศ. ${num + 543})`,
      },
      update: {
        label: label?.trim() || `ปี ${num} (พ.ศ. ${num + 543})`,
      },
    });

    return NextResponse.json({
      success: true,
      year: {
        year: saved.year,
        buddhistYear: saved.year + 543,
        label: saved.label,
        isCustom: true,
      },
    });
  } catch (error) {
    console.error('Create year error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกปี' }, { status: 500 });
  }
}
