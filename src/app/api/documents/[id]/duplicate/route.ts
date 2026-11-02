import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateDocumentNumber } from '@/lib/sequence';
import { recordAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const sourceDoc = await prisma.document.findUnique({
      where: { id },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          include: {
            categories: {
              orderBy: { orderIndex: 'asc' },
              include: {
                items: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!sourceDoc) {
      return NextResponse.json({ error: 'ไม่พบเอกสารต้นฉบับ' }, { status: 404 });
    }

    const sourceRev = sourceDoc.revisions[0];
    if (!sourceRev) {
      return NextResponse.json({ error: 'เอกสารต้นฉบับไม่มีข้อมูล Revision' }, { status: 400 });
    }

    // Generate brand new document number
    const newDocNumber = await generateDocumentNumber(
      sourceDoc.documentType as 'QUOTATION' | 'BOQ'
    );

    const duplicatedDoc = await prisma.$transaction(async (tx) => {
      const newDoc = await tx.document.create({
        data: {
          documentNumber: newDocNumber,
          documentType: sourceDoc.documentType,
          title: `สำเนา - ${sourceDoc.title}`,
          status: 'DRAFT',
          projectId: sourceDoc.projectId,
          customerId: sourceDoc.customerId,
          locationId: sourceDoc.locationId,
          customerName: sourceDoc.customerName,
          customerAddress: sourceDoc.customerAddress,
          customerTaxId: sourceDoc.customerTaxId,
          workingLocation: sourceDoc.workingLocation,
          currentRevisionNumber: 0,
          latestRevisionCode: 'Rev.00',
          version: 1,
          copiedFromId: sourceDoc.id,
          createdById: currentUser.userId,
          updatedById: currentUser.userId,
        },
      });

      const newRev = await tx.documentRevision.create({
        data: {
          documentId: newDoc.id,
          revisionNumber: 0,
          revisionCode: 'Rev.00',
          revisionReason: `ทำสำเนามาจากเอกสาร ${sourceDoc.documentNumber} (${sourceRev.revisionCode})`,
          isLatest: true,
          documentDate: new Date(),
          expiryDate: sourceRev.expiryDate,
          preparedBy: currentUser.name,
          checkedBy: sourceRev.checkedBy,
          approvedBy: sourceRev.approvedBy,
          notes: sourceRev.notes,
          paymentTerms: sourceRev.paymentTerms,
          executionDuration: sourceRev.executionDuration,
          warrantyDuration: sourceRev.warrantyDuration,
          vatRate: sourceRev.vatRate,
          isVatIncluded: sourceRev.isVatIncluded,
          discountType: sourceRev.discountType,
          discountValue: sourceRev.discountValue,
          subtotal: sourceRev.subtotal,
          discountAmount: sourceRev.discountAmount,
          totalBeforeVat: sourceRev.totalBeforeVat,
          vatAmount: sourceRev.vatAmount,
          grandTotal: sourceRev.grandTotal,
          thaiBahtText: sourceRev.thaiBahtText,
          createdById: currentUser.userId,
        },
      });

      // Clone categories and items
      for (const cat of sourceRev.categories) {
        const newCat = await tx.boqCategory.create({
          data: {
            revisionId: newRev.id,
            name: cat.name,
            orderIndex: cat.orderIndex,
            subtotal: cat.subtotal,
          },
        });

        for (const it of cat.items) {
          await tx.boqItem.create({
            data: {
              revisionId: newRev.id,
              categoryId: newCat.id,
              itemNo: it.itemNo,
              description: it.description,
              specification: it.specification,
              unit: it.unit,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              amount: it.amount,
              notes: it.notes,
              orderIndex: it.orderIndex,
            },
          });
        }
      }

      return newDoc;
    });

    // Audit logs for both new and source documents
    await recordAuditLog({
      documentId: duplicatedDoc.id,
      userId: currentUser.userId,
      action: 'DUPLICATE_DOCUMENT',
      details: `ทำสำเนามาจากเอกสาร ${sourceDoc.documentNumber} ได้รับเลขที่เอกสารใหม่เป็น ${duplicatedDoc.documentNumber}`,
    });

    await recordAuditLog({
      documentId: sourceDoc.id,
      userId: currentUser.userId,
      action: 'DUPLICATE_DOCUMENT',
      details: `ถูกทำสำเนาเป็นเอกสารใหม่ ${duplicatedDoc.documentNumber} โดย ${currentUser.name}`,
    });

    return NextResponse.json({
      success: true,
      document: duplicatedDoc,
      message: `ทำสำเนาเอกสารสำเร็จ เลขที่เอกสารใหม่: ${duplicatedDoc.documentNumber}`,
    });
  } catch (error) {
    console.error('Duplicate document error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการทำสำเนาเอกสาร' }, { status: 500 });
  }
}
