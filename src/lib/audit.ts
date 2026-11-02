import { prisma } from './prisma';

export async function recordAuditLog({
  documentId,
  userId,
  action,
  details,
}: {
  documentId?: string | null;
  userId: string;
  action: string;
  details: string;
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        documentId: documentId || null,
        userId,
        action,
        details,
      },
    });
  } catch (err) {
    console.error('Failed to create audit log:', err);
  }
}
