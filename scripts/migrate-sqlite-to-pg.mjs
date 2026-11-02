import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

function getJson(table) {
  try {
    const raw = execSync(`sqlite3 prisma/dev.db ".mode json" "SELECT * FROM ${table};"`).toString();
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Could not read table ${table}:`, err.message);
    return [];
  }
}

function toDate(val) {
  if (!val) return null;
  if (typeof val === 'number') return new Date(val);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

async function run() {
  console.log('--- Migrating Users ---');
  const users = getJson('User');
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        username: u.username,
        email: u.email,
        passwordHash: u.passwordHash,
        name: u.name,
        role: u.role || 'staff',
        avatarUrl: u.avatarUrl,
        isActive: Boolean(u.isActive),
        createdAt: toDate(u.createdAt) || new Date(),
        updatedAt: toDate(u.updatedAt) || new Date(),
      },
    });
  }
  console.log(`Migrated ${users.length} Users`);

  console.log('--- Migrating CompanySettings ---');
  const settings = getJson('CompanySettings');
  for (const s of settings) {
    await prisma.companySettings.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        companyNameTh: s.companyNameTh,
        companyNameEn: s.companyNameEn,
        taxId: s.taxId,
        address: s.address,
        phone: s.phone,
        email: s.email,
        website: s.website,
        quotationPrefix: s.quotationPrefix || 'QT',
        boqPrefix: s.boqPrefix || 'BOQ',
        defaultVatRate: Number(s.defaultVatRate) || 7.0,
        defaultPaymentTerms: s.defaultPaymentTerms,
        defaultWarrantyDuration: s.defaultWarrantyDuration,
        logoUrl: s.logoUrl,
        signatureUrl: s.signatureUrl,
        updatedAt: toDate(s.updatedAt) || new Date(),
      },
    });
  }

  console.log('--- Migrating Customers ---');
  const customers = getJson('Customer');
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        code: c.code,
        name: c.name,
        taxId: c.taxId,
        address: c.address,
        contactPerson: c.contactPerson,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        createdAt: toDate(c.createdAt) || new Date(),
        updatedAt: toDate(c.updatedAt) || new Date(),
      },
    });
  }
  console.log(`Migrated ${customers.length} Customers`);

  console.log('--- Migrating Projects ---');
  const projects = getJson('Project');
  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        projectCode: p.projectCode,
        name: p.name,
        workingLocation: p.workingLocation,
        projectAddress: p.projectAddress,
        coordinatorName: p.coordinatorName || p.contactPerson,
        coordinatorPhone: p.coordinatorPhone || p.contactPhone,
        notes: p.notes,
        status: p.status || 'Active',
        customer: p.customerId ? { connect: { id: p.customerId } } : undefined,
        createdAt: toDate(p.createdAt) || new Date(),
        updatedAt: toDate(p.updatedAt) || new Date(),
      },
    });
  }
  console.log(`Migrated ${projects.length} Projects`);

  console.log('--- Migrating Locations ---');
  const locations = getJson('Location');
  for (const l of locations) {
    await prisma.location.upsert({
      where: { id: l.id },
      update: {},
      create: {
        id: l.id,
        name: l.name,
        address: l.address,
        notes: l.notes,
        project: l.projectId ? { connect: { id: l.projectId } } : undefined,
        createdAt: toDate(l.createdAt) || new Date(),
        updatedAt: toDate(l.updatedAt) || new Date(),
      },
    });
  }

  console.log('--- Migrating Documents ---');
  const docs = getJson('Document');
  for (const d of docs) {
    await prisma.document.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        documentNumber: d.documentNumber,
        documentType: d.documentType,
        title: d.title,
        status: d.status,
        project: d.projectId ? { connect: { id: d.projectId } } : undefined,
        customer: d.customerId ? { connect: { id: d.customerId } } : undefined,
        location: d.locationId ? { connect: { id: d.locationId } } : undefined,
        createdBy: d.createdById ? { connect: { id: d.createdById } } : undefined,
        updatedBy: d.updatedById ? { connect: { id: d.updatedById } } : undefined,
        version: d.version || 1,
        createdAt: toDate(d.createdAt) || new Date(),
        updatedAt: toDate(d.updatedAt) || new Date(),
      },
    });
  }
  console.log(`Migrated ${docs.length} Documents`);

  console.log('--- Migrating DocumentRevisions ---');
  const revs = getJson('DocumentRevision');
  for (const r of revs) {
    await prisma.documentRevision.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        document: { connect: { id: r.documentId } },
        revisionNumber: Number(r.revisionNumber) || 0,
        revisionCode: r.revisionCode,
        revisionReason: r.revisionReason,
        isLatest: Boolean(r.isLatest),
        documentDate: toDate(r.documentDate) || new Date(),
        expiryDate: toDate(r.expiryDate),
        attnName: r.attnName,
        contactPerson: r.contactPerson,
        contactPhone: r.contactPhone,
        sitePhotoUrl: r.sitePhotoUrl,
        attachmentUrl: r.attachmentUrl,
        attachmentName: r.attachmentName,
        attachmentSize: r.attachmentSize ? Number(r.attachmentSize) : null,
        preparedBy: r.preparedBy,
        preparedSignatureUrl: r.preparedSignatureUrl,
        preparedDate: toDate(r.preparedDate),
        checkedBy: r.checkedBy,
        checkedSignatureUrl: r.checkedSignatureUrl,
        checkedDate: toDate(r.checkedDate),
        approvedBy: r.approvedBy,
        approvedSignatureUrl: r.approvedSignatureUrl,
        approvedDate: toDate(r.approvedDate),
        clientSignerName: r.clientSignerName,
        clientSignatureUrl: r.clientSignatureUrl,
        clientSignedDate: toDate(r.clientSignedDate),
        notes: r.notes,
        paymentTerms: r.paymentTerms,
        executionDuration: r.executionDuration,
        warrantyDuration: r.warrantyDuration,
        overheadRate: Number(r.overheadRate) || 0,
        overheadAmount: Number(r.overheadAmount) || 0,
        discountType: r.discountType || 'PERCENT',
        discountValue: Number(r.discountValue) || 0,
        discountAmount: Number(r.discountAmount) || 0,
        subtotal: Number(r.subtotal) || 0,
        totalBeforeVat: Number(r.totalBeforeVat || r.subtotal || 0),
        vatRate: Number(r.vatRate) || 7,
        vatAmount: Number(r.vatAmount) || 0,
        isVatIncluded: Boolean(r.isVatIncluded),
        grandTotal: Number(r.grandTotal) || 0,
        thaiBahtText: r.thaiBahtText || r.grandTotalTextTh || '',
        createdBy: { connect: { id: r.createdById || users[0].id } },
        createdAt: toDate(r.createdAt) || new Date(),
      },
    });
  }
  console.log(`Migrated ${revs.length} DocumentRevisions`);

  console.log('--- Migrating BoqCategories ---');
  const cats = getJson('BoqCategory');
  for (const c of cats) {
    await prisma.boqCategory.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        revision: { connect: { id: c.revisionId } },
        orderIndex: Number(c.orderIndex) || 0,
        name: c.name,
        subtotal: Number(c.subtotal) || 0,
      },
    });
  }
  console.log(`Migrated ${cats.length} Categories`);

  console.log('--- Migrating BoqItems ---');
  const items = getJson('BoqItem');
  for (const i of items) {
    await prisma.boqItem.upsert({
      where: { id: i.id },
      update: {},
      create: {
        id: i.id,
        revision: { connect: { id: i.revisionId } },
        category: i.categoryId ? { connect: { id: i.categoryId } } : undefined,
        itemNo: Number(i.itemNo) || 1,
        description: i.description || '',
        specification: i.specification || '',
        unit: i.unit || 'JOB',
        quantity: Number(i.quantity) || 1,
        materialPrice: Number(i.materialPrice) || 0,
        materialAmount: Number(i.materialAmount) || 0,
        laborPrice: Number(i.laborPrice) || 0,
        laborAmount: Number(i.laborAmount) || 0,
        unitPrice: Number(i.unitPrice) || 0,
        amount: Number(i.amount) || 0,
        notes: i.notes || '',
        orderIndex: Number(i.orderIndex) || 0,
      },
    });
  }
  console.log(`Migrated ${items.length} BoqItems`);

  console.log('--- Migrating Templates ---');
  const tpls = getJson('DocumentTemplate');
  for (const t of tpls) {
    await prisma.documentTemplate.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        defaultItemsJson: t.defaultItemsJson || '[]',
        isSystem: Boolean(t.isSystem),
        createdBy: t.createdById ? { connect: { id: t.createdById } } : undefined,
        createdAt: toDate(t.createdAt) || new Date(),
        updatedAt: toDate(t.updatedAt) || new Date(),
      },
    });
  }
  console.log(`Migrated ${tpls.length} Templates`);

  console.log('--- Migrating Sequences ---');
  const seqs = getJson('DocumentSequence');
  for (const s of seqs) {
    await prisma.documentSequence.upsert({
      where: {
        docType_year: {
          docType: s.docType,
          year: Number(s.year),
        },
      },
      update: {},
      create: {
        id: s.id,
        docType: s.docType,
        year: Number(s.year),
        currentSequence: Number(s.currentSequence) || 0,
        prefix: s.prefix || '',
      },
    });
  }
  console.log(`Migrated ${seqs.length} Sequences`);

  console.log('=== All data successfully migrated from SQLite to Neon PostgreSQL! ===');
}

run()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
