import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [
    totalDocs,
    inProgressDocs,
    completedDocs,
    totalProjects,
    totalCustomers,
    recentDocs,
  ] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({
      where: {
        status: { in: ['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW'] },
      },
    }),
    prisma.document.count({
      where: {
        status: { in: ['APPROVED', 'SENT', 'ACCEPTED'] },
      },
    }),
    prisma.project.count(),
    prisma.customer.count(),
    prisma.document.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
        customer: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, username: true } },
        updatedBy: { select: { id: true, name: true, username: true } },
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            revisionCode: true,
            grandTotal: true,
            documentDate: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    stats: {
      total: totalDocs,
      inProgress: inProgressDocs,
      completed: completedDocs,
      totalProjects,
      totalCustomers,
    },
    recentDocs,
  });
}
