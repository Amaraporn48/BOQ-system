import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { calculateDocumentTotals, thaiBahtText } from '@/lib/calculations';
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
    const revisions = await prisma.documentRevision.findMany({
      where: { documentId: id },
      orderBy: { revisionNumber: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, username: true } },
        categories: {
          orderBy: { orderIndex: 'asc' },
          include: {
            items: { orderBy: { orderIndex: 'asc' } },
          },
        },
      },
    });

    return NextResponse.json({ revisions });
  } catch (error) {
    console.error('Fetch revisions error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดประวัติ Revision' }, { status: 500 });
  }
}

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
    const body = await request.json();
    const {
      revisionReason,
      sourceRevisionId,
      status,
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
      overheadRate,
      attnName,
      contactPerson,
      contactPhone,
      sitePhotoUrl,
      vatRate,
      isVatIncluded,
      discountType,
      discountValue,
      categories,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      grandTotal,
    } = body;

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

    const effectiveReason = (revisionReason && revisionReason.trim()) ? revisionReason.trim() : 'ปรับปรุงข้อมูล';

    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          include: {
            categories: {
              orderBy: { orderIndex: 'asc' },
              include: { items: { orderBy: { orderIndex: 'asc' } } },
            },
          },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: 'ไม่พบเอกสาร' }, { status: 404 });
    }

    // Determine base revision to copy from
    let baseRevision = doc.revisions[0]; // default latest
    if (sourceRevisionId) {
      const found = doc.revisions.find((r) => r.id === sourceRevisionId);
      if (found) baseRevision = found;
    }

    if (!baseRevision) {
      return NextResponse.json({ error: 'ไม่พบ Revision อ้างอิง' }, { status: 400 });
    }

    const nextRevNum = doc.revisions.reduce((max, r) => Math.max(max, r.revisionNumber), -1) + 1;
    const nextRevCode = `Rev.${String(nextRevNum).padStart(2, '0')}`;

    // If categories are provided in payload, use them; otherwise copy from base revision
    let categoriesToSave: any[] = [];
    if (categories && Array.isArray(categories) && categories.length > 0) {
      categoriesToSave = categories;
    } else {
      categoriesToSave = baseRevision.categories.map((cat) => ({
        name: cat.name,
        items: cat.items.map((it) => ({
          itemNo: it.itemNo,
          description: it.description,
          specification: it.specification,
          unit: it.unit,
          quantity: it.quantity,
          materialPrice: it.materialPrice,
          laborPrice: it.laborPrice,
          unitPrice: it.unitPrice,
          amount: it.amount,
          notes: it.notes,
        })),
      }));
    }

    // Calculate totals
    const flatItems: any[] = [];
    categoriesToSave.forEach((c) => {
      (c.items || []).forEach((it: any) => {
        flatItems.push({
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          materialPrice: Number(it.materialPrice) || 0,
          laborPrice: Number(it.laborPrice) || 0,
        });
      });
    });

    const activeVatRate = vatRate !== undefined ? Number(vatRate) : baseRevision.vatRate;
    const activeIsVatIncluded = isVatIncluded !== undefined ? Boolean(isVatIncluded) : baseRevision.isVatIncluded;
    const activeDiscountType = discountType || baseRevision.discountType;
    const activeDiscountValue = discountValue !== undefined ? Number(discountValue) : baseRevision.discountValue;
    const activeOverheadRate = overheadRate !== undefined ? Number(overheadRate) : (baseRevision.overheadRate || 10.0);

    const totals = calculateDocumentTotals({
      items: flatItems,
      vatRate: activeVatRate,
      isVatIncluded: activeIsVatIncluded,
      discountType: activeDiscountType === 'AMOUNT' ? 'AMOUNT' : 'PERCENT',
      discountValue: activeDiscountValue,
      overheadRate: activeOverheadRate,
    });

    const isOverrideGrandTotal = categoriesToSave.length === 0 && grandTotal !== undefined;
    const finalGrandTotal = isOverrideGrandTotal ? (Number(grandTotal) || 0) : totals.grandTotal;
    const finalThaiBahtText = isOverrideGrandTotal ? thaiBahtText(finalGrandTotal) : totals.thaiBahtText;

    const newRev = await prisma.$transaction(async (tx) => {
      // Mark all previous revisions as isLatest = false
      await tx.documentRevision.updateMany({
        where: { documentId: id },
        data: { isLatest: false },
      });

      // Create new revision
      const createdRev = await tx.documentRevision.create({
        data: {
          documentId: id,
          revisionNumber: nextRevNum,
          revisionCode: nextRevCode,
          revisionReason: effectiveReason,
          isLatest: true,
          documentDate: parsedDocDate.date ?? new Date(),
          expiryDate: parsedExpiryDate.date ?? baseRevision.expiryDate,
          preparedBy: preparedBy || currentUser.name,
          preparedSignatureUrl: preparedSignatureUrl !== undefined ? preparedSignatureUrl : baseRevision.preparedSignatureUrl,
          preparedDate: parsedPreparedDate.date ?? parsedDocDate.date ?? new Date(),
          checkedBy: checkedBy !== undefined ? checkedBy : baseRevision.checkedBy,
          checkedSignatureUrl: checkedSignatureUrl !== undefined ? checkedSignatureUrl : baseRevision.checkedSignatureUrl,
          checkedDate: parsedCheckedDate.date !== undefined ? parsedCheckedDate.date : baseRevision.checkedDate,
          approvedBy: approvedBy !== undefined ? approvedBy : baseRevision.approvedBy,
          approvedSignatureUrl: approvedSignatureUrl !== undefined ? approvedSignatureUrl : baseRevision.approvedSignatureUrl,
          approvedDate: parsedApprovedDate.date ?? parsedDocDate.date ?? new Date(),
          clientSignerName: clientSignerName !== undefined ? clientSignerName : baseRevision.clientSignerName,
          clientSignatureUrl: clientSignatureUrl !== undefined ? clientSignatureUrl : baseRevision.clientSignatureUrl,
          clientSignedDate: parsedClientSignedDate.date !== undefined ? parsedClientSignedDate.date : baseRevision.clientSignedDate,
          attnName: attnName !== undefined ? attnName : baseRevision.attnName,
          contactPerson: contactPerson !== undefined ? contactPerson : baseRevision.contactPerson,
          contactPhone: contactPhone !== undefined ? contactPhone : baseRevision.contactPhone,
          sitePhotoUrl: sitePhotoUrl !== undefined ? sitePhotoUrl : baseRevision.sitePhotoUrl,
          notes: notes !== undefined ? notes : baseRevision.notes,
          paymentTerms: paymentTerms !== undefined ? paymentTerms : baseRevision.paymentTerms,
          executionDuration: executionDuration !== undefined ? executionDuration : baseRevision.executionDuration,
          warrantyDuration: warrantyDuration !== undefined ? warrantyDuration : baseRevision.warrantyDuration,
          attachmentUrl: attachmentUrl !== undefined ? (attachmentUrl ? attachmentUrl.trim() : null) : baseRevision.attachmentUrl,
          attachmentName: attachmentName !== undefined ? (attachmentName ? attachmentName.trim() : null) : baseRevision.attachmentName,
          attachmentSize: attachmentSize !== undefined ? (attachmentSize || null) : baseRevision.attachmentSize,
          vatRate: activeVatRate,
          isVatIncluded: activeIsVatIncluded,
          discountType: activeDiscountType,
          discountValue: activeDiscountValue,
          overheadRate: activeOverheadRate,
          overheadAmount: totals.overheadAmount,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          totalBeforeVat: totals.totalBeforeVat,
          vatAmount: totals.vatAmount,
          grandTotal: finalGrandTotal,
          thaiBahtText: finalThaiBahtText,
          createdById: currentUser.userId,
        },
      });

      for (let cIdx = 0; cIdx < categoriesToSave.length; cIdx++) {
        const catData = categoriesToSave[cIdx];
        const catItems = catData.items || [];
        let catSubtotal = 0;

        const category = await tx.boqCategory.create({
          data: {
            revisionId: createdRev.id,
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
              revisionId: createdRev.id,
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

      // Update parent document pointer & increment version
      await tx.document.update({
        where: { id },
        data: {
          currentRevisionNumber: nextRevNum,
          latestRevisionCode: nextRevCode,
          version: { increment: 1 },
          updatedById: currentUser.userId,
          status: status || 'PENDING_REVIEW',
        },
      });

      return createdRev;
    });

    await recordAuditLog({
      documentId: id,
      userId: currentUser.userId,
      action: 'CREATE_REVISION',
      details: `สร้าง Revision ${nextRevCode} เหตุผล: ${effectiveReason} (สถานะ: ${status || 'PENDING_REVIEW'}) (ยอดรวม ${finalGrandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`,
    });

    return NextResponse.json({
      success: true,
      revision: newRev,
      message: `สร้าง ${nextRevCode} สำเร็จเรียบร้อย`,
    });
  } catch (error) {
    console.error('Create revision error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้าง Revision' }, { status: 500 });
  }
}
