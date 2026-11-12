import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { calculateDocumentTotals } from '@/lib/calculations';
import { thaiBahtText } from '@/lib/bahttext';
import { recordAuditLog } from '@/lib/audit';
import { parseOptionalDate } from '@/lib/dateUtils';

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
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            projectCode: true,
            workingLocation: true,
            projectAddress: true,
            coordinatorName: true,
            coordinatorPhone: true,
          },
        },
        customer: true,
        location: true,
        createdBy: { select: { id: true, name: true, username: true } },
        updatedBy: { select: { id: true, name: true, username: true } },
        copiedFrom: { select: { id: true, documentNumber: true, title: true } },
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          include: {
            createdBy: { select: { id: true, name: true, username: true } },
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
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'ไม่พบเอกสารนี้ในระบบ' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Get document detail error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลเอกสาร' }, { status: 500 });
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
    const {
      expectedVersion,
      status,
      documentNumber,
      title,
      projectId,
      customerId,
      locationId,
      customerName,
      customerAddress,
      customerTaxId,
      workingLocation,
      attnName,
      contactPerson,
      contactPhone,
      sitePhotoUrl,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      revisionId,
      documentDate,
      expiryDate,
      preparedBy,
      preparedSignatureUrl,
      preparedDate,
      checkedBy,
      checkedSignatureUrl,
      checkedDate,
      approvedBy,
      approvedSignatureUrl,
      approvedDate,
      clientSignerName,
      clientSignatureUrl,
      clientSignedDate,
      notes,
      paymentTerms,
      executionDuration,
      warrantyDuration,
      overheadRate = 10.0,
      vatRate = 7.0,
      isVatIncluded = false,
      discountType = 'PERCENT',
      discountValue = 0,
      categories = [],
    } = body;

    const existingDoc = await prisma.document.findUnique({
      where: { id },
      include: {
        updatedBy: { select: { name: true, username: true } },
      },
    });

    if (!existingDoc) {
      return NextResponse.json({ error: 'ไม่พบเอกสาร' }, { status: 404 });
    }

    // Optimistic Concurrency Control check
    if (typeof expectedVersion === 'number' && existingDoc.version !== expectedVersion) {
      return NextResponse.json(
        {
          error: 'CONFLICT',
          message: `ข้อมูลถูกแก้ไขโดย ${existingDoc.updatedBy.name} เมื่อ ${new Date(
            existingDoc.updatedAt
          ).toLocaleString('th-TH')} แล้ว กรุณารีเฟรชเพื่อโหลดข้อมูลล่าสุดก่อนทำการบันทึกเพื่อป้องกันการบันทึกทับ`,
          currentVersion: existingDoc.version,
        },
        { status: 409 }
      );
    }

    // Calculate totals
    const allFlatItems: any[] = [];
    categories.forEach((cat: any) => {
      (cat.items || []).forEach((item: any) => {
        allFlatItems.push({
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          materialPrice: Number(item.materialPrice) || 0,
          laborPrice: Number(item.laborPrice) || 0,
        });
      });
    });

    let totals: any;
    if (body.grandTotal !== undefined && body.grandTotal !== null && allFlatItems.length === 0) {
      const g = Number(body.grandTotal) || 0;
      totals = {
        materialTotal: 0,
        laborTotal: 0,
        subtotal: g,
        discountAmount: 0,
        afterDiscount: g,
        overheadRate: 0,
        overheadAmount: 0,
        totalBeforeVat: g,
        vatAmount: 0,
        grandTotal: g,
        thaiBahtText: thaiBahtText(g),
      };
    } else {
      totals = calculateDocumentTotals({
        items: allFlatItems,
        vatRate: Number(vatRate) || 0,
        isVatIncluded: Boolean(isVatIncluded),
        discountType: discountType === 'AMOUNT' ? 'AMOUNT' : 'PERCENT',
        discountValue: Number(discountValue) || 0,
        overheadRate: Number(overheadRate) || 0,
      });
    }

    // Validate optional dates before writing
    const parsedDocDate = parseOptionalDate(documentDate, 'วันที่เอกสาร');
    const parsedExpiryDate = parseOptionalDate(expiryDate, 'วันหมดอายุ');
    const parsedPreparedDate = parseOptionalDate(preparedDate, 'วันที่จัดทำ');
    const parsedCheckedDate = parseOptionalDate(checkedDate, 'วันที่ตรวจสอบ');
    const parsedApprovedDate = parseOptionalDate(approvedDate, 'วันที่อนุมัติ');
    const parsedClientSignedDate = parseOptionalDate(clientSignedDate, 'วันที่ลูกค้าลงนาม');
    const dateError =
      parsedDocDate.error ||
      parsedExpiryDate.error ||
      parsedPreparedDate.error ||
      parsedCheckedDate.error ||
      parsedApprovedDate.error ||
      parsedClientSignedDate.error;
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }

    // Check if new documentNumber is unique if changed
    let newDocNumber = existingDoc.documentNumber;
    if (documentNumber && documentNumber.trim() !== existingDoc.documentNumber) {
      const duplicate = await prisma.document.findUnique({
        where: { documentNumber: documentNumber.trim() },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: `เลขที่เอกสาร "${documentNumber.trim()}" มีอยู่ในระบบแล้ว` },
          { status: 400 }
        );
      }
      newDocNumber = documentNumber.trim();
    }

    // Execute atomic update
    const updated = await prisma.$transaction(async (tx) => {
      // Update parent document
      const doc = await tx.document.update({
        where: { id },
        data: {
          documentNumber: newDocNumber,
          title: title ? title.trim() : existingDoc.title,
          status: status || existingDoc.status,
          projectId: projectId !== undefined ? projectId : existingDoc.projectId,
          customerId: customerId !== undefined ? customerId : existingDoc.customerId,
          locationId: locationId !== undefined ? locationId : existingDoc.locationId,
          customerName: customerName !== undefined ? customerName : existingDoc.customerName,
          customerAddress: customerAddress !== undefined ? customerAddress : existingDoc.customerAddress,
          customerTaxId: customerTaxId !== undefined ? customerTaxId : existingDoc.customerTaxId,
          workingLocation: workingLocation !== undefined ? workingLocation : existingDoc.workingLocation,
          attnName: attnName !== undefined ? attnName : existingDoc.attnName,
          contactPerson: contactPerson !== undefined ? contactPerson : existingDoc.contactPerson,
          contactPhone: contactPhone !== undefined ? contactPhone : existingDoc.contactPhone,
          version: { increment: 1 },
          updatedById: currentUser.userId,
        },
      });

      // Target revision to update (default to the latest revision or given revisionId)
      let targetRevId = revisionId;
      if (!targetRevId) {
        const latestRev = await tx.documentRevision.findFirst({
          where: { documentId: id },
          orderBy: { revisionNumber: 'desc' },
        });
        targetRevId = latestRev?.id;
      }

      if (targetRevId) {
        await tx.documentRevision.update({
          where: { id: targetRevId },
          data: {
            documentDate: parsedDocDate.date ?? undefined,
            expiryDate: parsedExpiryDate.date !== undefined ? parsedExpiryDate.date : null,
            preparedBy: preparedBy !== undefined ? preparedBy : undefined,
            preparedSignatureUrl: preparedSignatureUrl !== undefined ? preparedSignatureUrl : undefined,
            preparedDate: parsedPreparedDate.date,
            checkedBy: checkedBy !== undefined ? checkedBy : undefined,
            checkedSignatureUrl: checkedSignatureUrl !== undefined ? checkedSignatureUrl : undefined,
            checkedDate: parsedCheckedDate.date,
            approvedBy: approvedBy !== undefined ? approvedBy : undefined,
            approvedSignatureUrl: approvedSignatureUrl !== undefined ? approvedSignatureUrl : undefined,
            approvedDate: parsedApprovedDate.date,
            clientSignerName: clientSignerName !== undefined ? clientSignerName : undefined,
            clientSignatureUrl: clientSignatureUrl !== undefined ? clientSignatureUrl : undefined,
            clientSignedDate: parsedClientSignedDate.date,
            attnName: attnName !== undefined ? attnName : undefined,
            contactPerson: contactPerson !== undefined ? contactPerson : undefined,
            contactPhone: contactPhone !== undefined ? contactPhone : undefined,
            sitePhotoUrl: sitePhotoUrl !== undefined ? sitePhotoUrl : undefined,
            attachmentUrl: attachmentUrl !== undefined ? (attachmentUrl || null) : undefined,
            attachmentName: attachmentName !== undefined ? (attachmentName || null) : undefined,
            attachmentSize: attachmentSize !== undefined ? (attachmentSize ? Number(attachmentSize) : null) : undefined,
            notes: notes !== undefined ? notes : undefined,
            paymentTerms: paymentTerms !== undefined ? paymentTerms : undefined,
            executionDuration: executionDuration !== undefined ? executionDuration : undefined,
            warrantyDuration: warrantyDuration !== undefined ? warrantyDuration : undefined,
            vatRate: Number(vatRate) || 0,
            isVatIncluded: Boolean(isVatIncluded),
            discountType: discountType === 'AMOUNT' ? 'AMOUNT' : 'PERCENT',
            discountValue: Number(discountValue) || 0,
            overheadRate: Number(overheadRate) || 0,
            overheadAmount: totals.overheadAmount,
            subtotal: totals.subtotal,
            discountAmount: totals.discountAmount,
            totalBeforeVat: totals.totalBeforeVat,
            vatAmount: totals.vatAmount,
            grandTotal: totals.grandTotal,
            thaiBahtText: totals.thaiBahtText,
          },
        });

        // Replace categories and items cleanly for this revision
        await tx.boqCategory.deleteMany({
          where: { revisionId: targetRevId },
        });

        for (let cIdx = 0; cIdx < categories.length; cIdx++) {
          const catData = categories[cIdx];
          const catItems = catData.items || [];
          let catSubtotal = 0;

          const category = await tx.boqCategory.create({
            data: {
              revisionId: targetRevId,
              name: catData.name || `หมวดงานที่ ${cIdx + 1}`,
              orderIndex: cIdx,
              subtotal: 0,
            },
          });

          for (let iIdx = 0; iIdx < catItems.length; iIdx++) {
            const item = catItems[iIdx];
            const qty = Number(item.quantity) || 0;
            const matPrice = Number(item.materialPrice) || 0;
            const labPrice = Number(item.laborPrice) || 0;
            const matAmt = Math.round(qty * matPrice * 100) / 100;
            const labAmt = Math.round(qty * labPrice * 100) / 100;

            let unitPrice = matPrice + labPrice;
            let amt = matAmt + labAmt;
            if (amt === 0 && item.unitPrice) {
              unitPrice = Number(item.unitPrice) || 0;
              amt = Math.round(qty * unitPrice * 100) / 100;
            }

            catSubtotal += amt;

            await tx.boqItem.create({
              data: {
                revisionId: targetRevId,
                categoryId: category.id,
                itemNo: item.itemNo || iIdx + 1,
                description: item.description || '',
                specification: item.specification || null,
                unit: item.unit || 'งาน',
                quantity: qty,
                materialPrice: matPrice,
                materialAmount: matAmt,
                laborPrice: labPrice,
                laborAmount: labAmt,
                unitPrice: unitPrice,
                amount: amt,
                notes: item.notes || null,
                orderIndex: iIdx,
              },
            });
          }

          await tx.boqCategory.update({
            where: { id: category.id },
            data: { subtotal: Math.round(catSubtotal * 100) / 100 },
          });
        }
      }

      return doc;
    });

    await recordAuditLog({
      documentId: id,
      userId: currentUser.userId,
      action: 'EDIT_DOCUMENT',
      details: `แก้ไขเอกสาร ${updated.documentNumber} (ยอดรวมสุทธิ ${totals.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`,
    });

    return NextResponse.json({ success: true, document: updated });
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกเอกสาร' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const document = await prisma.document.findUnique({
      where: { id },
      select: { id: true, documentNumber: true, status: true },
    });

    if (!document) {
      return NextResponse.json({ error: 'ไม่พบเอกสาร' }, { status: 404 });
    }

    // Delete document permanently so its sequence number is released and recycled
    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: `ลบเอกสาร ${document.documentNumber} เรียบร้อยแล้ว` });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการยกเลิกเอกสาร' }, { status: 500 });
  }
}
