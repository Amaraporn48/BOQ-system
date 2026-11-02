import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะ Admin เท่านั้นที่สามารถสำรองข้อมูลได้' }, { status: 403 });
    }

    const [
      users,
      customers,
      locations,
      projects,
      documents,
      revisions,
      categories,
      items,
      templates,
      companySettings,
      sequences,
      auditLogs,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.customer.findMany(),
      prisma.location.findMany(),
      prisma.project.findMany(),
      prisma.document.findMany(),
      prisma.documentRevision.findMany(),
      prisma.boqCategory.findMany(),
      prisma.boqItem.findMany(),
      prisma.documentTemplate.findMany(),
      prisma.companySettings.findMany(),
      prisma.documentSequence.findMany(),
      prisma.auditLog.findMany({ take: 200 }),
    ]);

    const backupPayload = {
      backupTimestamp: new Date().toISOString(),
      version: '1.0',
      exportedBy: currentUser.username,
      data: {
        users,
        customers,
        locations,
        projects,
        documents,
        revisions,
        categories,
        items,
        templates,
        companySettings,
        sequences,
        auditLogs,
      },
    };

    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="boq_system_backup_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสำรองข้อมูล' }, { status: 500 });
  }
}
