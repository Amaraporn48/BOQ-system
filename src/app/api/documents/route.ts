import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateDocumentNumber } from '@/lib/sequence';
import { calculateDocumentTotals } from '@/lib/calculations';
import { thaiBahtText } from '@/lib/bahttext';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const docType = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const projectId = searchParams.get('projectId') || '';
    const customerId = searchParams.get('customerId') || '';
    const jobType = searchParams.get('jobType') || ''; // 'project' | 'general'
    const year = searchParams.get('year') || '';
    const location = searchParams.get('location')?.trim() || '';
    const filterUser = searchParams.get('user') || ''; // 'me' or specific user id
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortDir = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc';

    const where: any = {};

    if (query) {
      where.OR = [
        { documentNumber: { contains: query } },
        { title: { contains: query } },
        { customerName: { contains: query } },
        { workingLocation: { contains: query } },
        { project: { name: { contains: query } } },
        { customer: { name: { contains: query } } },
      ];
    }

    if (docType && ['QUOTATION', 'BOQ'].includes(docType)) {
      where.documentType = docType;
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    } else if (jobType === 'project') {
      where.projectId = { not: null };
    } else if (jobType === 'general') {
      where.projectId = null;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (location) {
      const locConditions = [
        { workingLocation: { contains: location } },
        { location: { name: { contains: location } } },
        { locationId: location },
        { customerName: { contains: location } },
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
          { createdAt: { gte: startOfYear, lt: endOfYear } },
          { documentNumber: { contains: String(yNum) } },
          { documentNumber: { contains: `-${bYear2}-` } },
          { documentNumber: { contains: `-${cYear2}-` } },
        ];

        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: yearConditions }];
          delete where.OR;
        } else {
          where.OR = yearConditions;
        }
      }
    }

    if (filterUser === 'me') {
      where.createdById = currentUser.userId;
    } else if (filterUser && filterUser !== 'all') {
      where.createdById = filterUser;
    }

    let orderBy: any = { updatedAt: 'desc' };
    if (sortBy === 'documentNumber') {
      orderBy = { documentNumber: sortDir };
    } else if (sortBy === 'title') {
      orderBy = { title: sortDir };
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortDir };
    } else if (sortBy === 'updatedAt') {
      orderBy = { updatedAt: sortDir };
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy,
      include: {
        project: { select: { id: true, name: true, projectCode: true } },
        customer: { select: { id: true, name: true, taxId: true } },
        location: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, username: true } },
        updatedBy: { select: { id: true, name: true, username: true } },
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          select: {
            id: true,
            revisionNumber: true,
            revisionCode: true,
            revisionReason: true,
            isLatest: true,
            grandTotal: true,
            subtotal: true,
            vatAmount: true,
            documentDate: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Fetch documents error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดรายการเอกสาร' }, { status: 500 });
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
      documentType, // 'QUOTATION' | 'BOQ'
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

    if (!documentType || !['QUOTATION', 'BOQ'].includes(documentType)) {
      return NextResponse.json({ error: 'กรุณาระบุประเภทเอกสารที่ถูกต้อง' }, { status: 400 });
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อเอกสาร / ชื่องาน' }, { status: 400 });
    }

    // Determine document number: user-specified or auto-generated
    let documentNumber = body.documentNumber ? body.documentNumber.trim() : '';
    if (documentNumber) {
      const existing = await prisma.document.findUnique({
        where: { documentNumber },
      });
      if (existing) {
        return NextResponse.json(
          { error: `เลขที่เอกสาร "${documentNumber}" มีอยู่ในระบบแล้ว กรุณาใช้เลขที่อื่น` },
          { status: 400 }
        );
      }
    } else {
      documentNumber = await generateDocumentNumber({
        docType: documentType,
        date: documentDate,
      });
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

    // Run transaction to create document and initial Rev.00
    const newDoc = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          documentNumber,
          documentType,
          title: title.trim(),
          status: 'DRAFT',
          projectId: projectId || null,
          customerId: customerId || null,
          locationId: locationId || null,
          customerName: customerName || null,
          customerAddress: customerAddress || null,
          customerTaxId: customerTaxId || null,
          workingLocation: workingLocation || null,
          attnName: attnName || null,
          contactPerson: contactPerson || null,
          contactPhone: contactPhone || null,
          currentRevisionNumber: 0,
          latestRevisionCode: 'Rev.00',
          version: 1,
          createdById: currentUser.userId,
          updatedById: currentUser.userId,
        },
      });

      const rev = await tx.documentRevision.create({
        data: {
          documentId: doc.id,
          revisionNumber: 0,
          revisionCode: 'Rev.00',
          revisionReason: 'จัดทำเอกสารฉบับเริ่มต้น',
          isLatest: true,
          documentDate: documentDate ? new Date(documentDate) : new Date(),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          preparedBy: preparedBy || currentUser.name,
          preparedSignatureUrl: preparedSignatureUrl || null,
          preparedDate: preparedDate ? new Date(preparedDate) : (documentDate ? new Date(documentDate) : new Date()),
          checkedBy: checkedBy || null,
          checkedSignatureUrl: checkedSignatureUrl || null,
          checkedDate: checkedDate ? new Date(checkedDate) : null,
          approvedBy: approvedBy || null,
          approvedSignatureUrl: approvedSignatureUrl || null,
          approvedDate: approvedDate ? new Date(approvedDate) : (documentDate ? new Date(documentDate) : new Date()),
          clientSignerName: clientSignerName || null,
          clientSignatureUrl: clientSignatureUrl || null,
          clientSignedDate: clientSignedDate ? new Date(clientSignedDate) : null,
          attnName: attnName || null,
          contactPerson: contactPerson || null,
          contactPhone: contactPhone || null,
          sitePhotoUrl: sitePhotoUrl || null,
          attachmentUrl: attachmentUrl || null,
          attachmentName: attachmentName || null,
          attachmentSize: attachmentSize ? Number(attachmentSize) : null,
          notes: notes || null,
          paymentTerms: paymentTerms || null,
          executionDuration: executionDuration || null,
          warrantyDuration: warrantyDuration || null,
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
          createdById: currentUser.userId,
        },
      });

      // Create categories and items
      for (let cIdx = 0; cIdx < categories.length; cIdx++) {
        const catData = categories[cIdx];
        const catItems = catData.items || [];
        let catSubtotal = 0;

        const category = await tx.boqCategory.create({
          data: {
            revisionId: rev.id,
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
              revisionId: rev.id,
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

      return doc;
    });

    await recordAuditLog({
      documentId: newDoc.id,
      userId: currentUser.userId,
      action: 'CREATE_DOCUMENT',
      details: `สร้างเอกสาร ${documentType === 'QUOTATION' ? 'ใบเสนอราคา' : 'BOQ'} เลขที่ ${newDoc.documentNumber} (Rev.00)`,
    });

    return NextResponse.json({ success: true, document: newDoc });
  } catch (error) {
    console.error('Create document error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างเอกสาร' }, { status: 500 });
  }
}
