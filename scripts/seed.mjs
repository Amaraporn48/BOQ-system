import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Clearing old data ---');
  await prisma.auditLog.deleteMany();
  await prisma.boqItem.deleteMany();
  await prisma.boqCategory.deleteMany();
  await prisma.documentRevision.deleteMany();
  await prisma.document.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.documentSequence.deleteMany();
  await prisma.location.deleteMany();
  await prisma.project.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.companySettings.deleteMany();
  await prisma.user.deleteMany();

  console.log('--- Creating Company Settings ---');
  await prisma.companySettings.create({
    data: {
      id: 'default',
      companyNameTh: 'บริษัท สยามวิศวกรรมและรับเหมาก่อสร้าง จำกัด',
      companyNameEn: 'Siam Engineering & Construction Co., Ltd.',
      taxId: '0105559012345',
      address: '888/99 ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',
      phone: '02-987-6543, 081-234-5678',
      email: 'contact@siamengineering.co.th',
      website: 'www.siamengineering.co.th',
      quotationPrefix: 'QT',
      boqPrefix: 'BOQ',
      defaultVatRate: 7.0,
      defaultPaymentTerms: 'มัดจำ 30% เมื่อลงนามสัญญา, 40% เมื่องานคืบหน้า 50%, 30% เมื่องานส่งมอบเรียบร้อย',
      defaultWarrantyDuration: '1 ปี นับจากวันส่งมอบงาน',
    },
  });

  console.log('--- Creating Users ---');
  const passwordHash = await bcrypt.hash('1234', 10);
  const staffPasswordHash = await bcrypt.hash('staff1234', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@siamengineering.co.th',
      passwordHash,
      name: 'สมชาย ผู้ดูแลระบบ (Admin)',
      role: 'admin',
      isActive: true,
    },
  });

  const staffA = await prisma.user.create({
    data: {
      username: 'staff_a',
      email: 'somsak@siamengineering.co.th',
      passwordHash: staffPasswordHash,
      name: 'นาย สมศักดิ์ ช่างประเมิน (Staff A)',
      role: 'staff',
      isActive: true,
    },
  });

  const staffB = await prisma.user.create({
    data: {
      username: 'staff_b',
      email: 'wipaporn@siamengineering.co.th',
      passwordHash: staffPasswordHash,
      name: 'นางสาว วิภาภรณ์ วิศวกรโครงการ (Staff B)',
      role: 'staff',
      isActive: true,
    },
  });

  const staffC = await prisma.user.create({
    data: {
      username: 'staff_c',
      email: 'panumat@siamengineering.co.th',
      passwordHash: staffPasswordHash,
      name: 'นาย ภานุมาศ ฝ่ายจัดซื้อ (Staff C)',
      role: 'staff',
      isActive: true,
    },
  });

  console.log('--- Creating Customers ---');
  const cust1 = await prisma.customer.create({
    data: {
      code: 'CUST-001',
      name: 'บริษัท สยามพารากอน ดีเวลลอปเม้นท์ จำกัด',
      taxId: '0105548001122',
      address: '991 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330',
      contactPerson: 'คุณ ธนพล (ผู้จัดการฝ่ายอาคาร)',
      phone: '02-610-8000 ต่อ 214',
      email: 'tanapol@siamparagon.co.th',
    },
  });

  const cust2 = await prisma.customer.create({
    data: {
      code: 'CUST-002',
      name: 'บริษัท กรุงเทพดุสิตเวชการ จำกัด (มหาชน) - รพ.กรุงเทพ',
      taxId: '0107537000059',
      address: '2 ซอยศูนย์วิจัย 7 ถนนเพชรบุรีตัดใหม่ แขวงบางกะปิ เขตห้วยขวาง กรุงเทพฯ 10310',
      contactPerson: 'คุณ วรัญญา (ฝ่ายวิศวกรรมการแพทย์)',
      phone: '02-310-3000',
      email: 'waranya@bangkokhospital.com',
    },
  });

  const cust3 = await prisma.customer.create({
    data: {
      code: 'CUST-003',
      name: 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)',
      taxId: '0107542000011',
      address: '313 อาคาร ซี.พี.ทาวเวอร์ ชั้น 24 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพฯ 10500',
      contactPerson: 'คุณ ชาตรี (วิศวกรโครงสร้าง)',
      phone: '02-071-9000',
      email: 'chatree@cpall.co.th',
    },
  });

  console.log('--- Creating Projects & Locations ---');
  const proj1 = await prisma.project.create({
    data: {
      projectCode: 'PRJ-2026-001',
      name: 'โครงการปรับปรุงระบบปรับอากาศ VRV ชั้น 4 สยามพารากอน',
      customerId: cust1.id,
      workingLocation: 'อาคารสยามพารากอน ชั้น 4 โซนอาหาร',
      projectAddress: '991 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ 10330',
      coordinatorName: 'คุณ ธนพล',
      coordinatorPhone: '02-610-8000 ต่อ 214',
      status: 'Active',
      notes: 'งานเร่งด่วน ต้องเข้าทำงานเฉพาะกะกลางคืน 22:00 - 06:00 น.',
    },
  });

  const loc1 = await prisma.location.create({
    data: {
      name: 'อาคารสยามพารากอน ชั้น 4 โซนอาหาร',
      address: '991 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330',
      notes: 'ประตูขนของ Gate 3 ด้านหลัง',
      projectId: proj1.id,
    },
  });

  const loc2 = await prisma.location.create({
    data: {
      name: 'อาคารสยามพารากอน ชั้น B1 โซน Sea Life',
      address: '991 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330',
      notes: 'จุดต่อท่อน้ำเย็น Chiller',
      projectId: proj1.id,
    },
  });

  const proj2 = await prisma.project.create({
    data: {
      projectCode: 'PRJ-2026-002',
      name: 'โครงการติดตั้งระบบไฟฟ้าสำรองฉุกเฉินและตู้ MDB รพ.กรุงเทพ',
      customerId: cust2.id,
      workingLocation: 'โรงพยาบาลกรุงเทพ อาคารผู้ป่วยนอก ชั้น B2 ห้องไฟฟ้า',
      projectAddress: '2 ซอยศูนย์วิจัย 7 ถนนเพชรบุรีตัดใหม่ แขวงบางกะปิ เขตห้วยขวาง กรุงเทพฯ 10310',
      coordinatorName: 'คุณ วรัญญา',
      coordinatorPhone: '02-310-3000',
      status: 'Active',
      notes: 'ต้องผ่านการตรวจความปลอดภัยและสวมชุด PPE ตลอดเวลา',
    },
  });

  const loc3 = await prisma.location.create({
    data: {
      name: 'โรงพยาบาลกรุงเทพ อาคารผู้ป่วยนอก ชั้น B2 ห้องไฟฟ้า',
      address: '2 ซอยศูนย์วิจัย 7 ถนนเพชรบุรีตัดใหม่ แขวงบางกะปิ เขตห้วยขวาง กรุงเทพฯ 10310',
      notes: 'ห้ามตัดกระแสไฟเกิน 15 นาที และต้องประสานงานล่วงหน้า 3 วัน',
      projectId: proj2.id,
    },
  });

  console.log('--- Creating Document Templates ---');
  await prisma.documentTemplate.create({
    data: {
      name: 'งานระบบปรับอากาศและระบายอากาศ (HVAC)',
      description: 'เทมเพลตมาตรฐานสำหรับงานติดตั้งเครื่องปรับอากาศ VRV, แอร์แยกส่วน, งานท่อลม และท่อน้ำยา',
      category: 'งานระบบปรับอากาศ',
      isSystem: true,
      defaultItemsJson: JSON.stringify([
        {
          name: '1. หมวดงานเครื่องปรับอากาศและคอยล์ร้อน/เย็น',
          items: [
            { description: 'เครื่องปรับอากาศชนิดต่อท่อลม (Ducted Type) Inverter 48,000 BTU', specification: 'Daikin FDXS-F หรือเทียบเท่า พร้อม Remote Control', unit: 'ชุด', quantity: 2, unitPrice: 58000, notes: 'รวมแผ่นกรองฝุ่น PM 2.5' },
            { description: 'เครื่องปรับอากาศชนิดฝังฝ้า 4 ทิศทาง (Cassette Type) 36,000 BTU', specification: 'Carrier 40VBF หรือเทียบเท่า', unit: 'ชุด', quantity: 4, unitPrice: 42000, notes: 'หน้ากากพร้อมชุดปั๊มเดรนน้ำทิ้ง' },
          ],
        },
        {
          name: '2. หมวดงานท่อน้ำยา ท่อน้ำทิ้ง และฉนวนหุ้ม',
          items: [
            { description: 'งานเดินท่อน้ำยาทำความเย็นทองแดง Class M พร้อมฉนวนยางหนา 1/2 นิ้ว', specification: 'ท่อทองแดง Kembla ฉนวน Aeroflex', unit: 'เมตร', quantity: 80, unitPrice: 650, notes: 'รวมขายึดและซัพพอร์ตกันสะเทือน' },
            { description: 'งานเดินท่อน้ำทิ้ง PVC ชั้น 8.5 ขนาด 3/4 นิ้ว หุ้มฉนวนกันหยดน้ำ', specification: 'ท่อน้ำไทย พร้อมข้องอและสามทาง', unit: 'เมตร', quantity: 50, unitPrice: 280, notes: 'ทดสอบการไหลและทดสอบรั่ว' },
          ],
        },
        {
          name: '3. หมวดงานค่าแรงติดตั้ง ทดสอบ และตรวจรับงาน',
          items: [
            { description: 'ค่าแรงติดตั้งเครื่องปรับอากาศ แขวนคอยล์เย็น ตั้งคอยล์ร้อน', specification: 'ช่างผู้ชำนาญการมาตรฐาน กรมพัฒนาฝีมือแรงงาน', unit: 'งาน', quantity: 1, unitPrice: 35000, notes: 'รวมนั่งร้านและอุปกรณ์เซฟตี้' },
            { description: 'งาน Vacuum, อัดไนโตรเจนทดสอบแรงดัน และเติมน้ำยาทำความเย็น R32/R410A', specification: 'ตามมาตรฐานผู้ผลิต', unit: 'ระบบ', quantity: 1, unitPrice: 15000, notes: 'มีใบรายงานผลการทดสอบ (Test Report)' },
          ],
        },
      ]),
    },
  });

  await prisma.documentTemplate.create({
    data: {
      name: 'งานระบบไฟฟ้าและตู้ควบคุม (Electrical & MDB)',
      description: 'เทมเพลตมาตรฐานงานเดินสายไฟฟ้า Main Feed, ตู้ MDB, แผงย่อย DB, โคมไฟ LED และสายกราวด์',
      category: 'งานระบบไฟฟ้า',
      isSystem: true,
      defaultItemsJson: JSON.stringify([
        {
          name: '1. หมวดงานตู้ควบคุมไฟฟ้าและอุปกรณ์ป้องกัน',
          items: [
            { description: 'ตู้ควบคุมไฟฟ้า Main Distribution Board (MDB) ขนาด 250A 3P 22kA', specification: 'ตู้สวิตช์บอร์ดเหล็กเบอร์ 16 พ่นสีฝุ่น IP43 พร้อม MCCB Schneider', unit: 'ตู้', quantity: 1, unitPrice: 125000, notes: 'พร้อม Digital Power Meter' },
            { description: 'แผงย่อยกระจายไฟฟ้า (DB) 24 วงจรย่อย พร้อมเมนเบรกเกอร์ 100A', specification: 'Square D / Schneider Electric', unit: 'ตู้', quantity: 2, unitPrice: 28500, notes: 'พร้อมลูกย่อย 1P 16A-32A' },
          ],
        },
        {
          name: '2. หมวดงานเดินสายไฟและราง Wireway',
          items: [
            { description: 'สายไฟฟ้าทองแดงหุ้มฉนวน XLPE/PVC ขนาด 4x50 sq.mm.', specification: 'BCC หรือ Phelps Dodge', unit: 'เมตร', quantity: 120, unitPrice: 850, notes: 'ร้อยในท่อหรือวางบนรางสายไฟ' },
            { description: 'รางเดินสายไฟ Wireway ชุบ Hot-Dip Galvanized ขนาด 200x100 มม.', specification: 'ความหนา 1.6 มม. พร้อมข้อต่อและซัพพอร์ต', unit: 'เมตร', quantity: 45, unitPrice: 720, notes: 'ยึดติดเพดานด้วย Rod M10' },
          ],
        },
        {
          name: '3. หมวดงานทดสอบระบบและออกใบรับรองวิศวกร',
          items: [
            { description: 'งานทดสอบ Insulation Resistance และค่าความต้านทานดิน (Grounding Test)', specification: 'ค่าความต้านทานดินไม่เกิน 5 โอห์ม', unit: 'ระบบ', quantity: 1, unitPrice: 18000, notes: 'รับรองโดยสามัญวิศวกรไฟฟ้า' },
          ],
        },
      ]),
    },
  });

  await prisma.documentTemplate.create({
    data: {
      name: 'งานระบบสุขาภิบาลและดับเพลิง (Plumbing & Fire)',
      description: 'เทมเพลตงานเดินท่อน้ำดี น้ำเสีย ท่อดับเพลิง และปั๊มน้ำ',
      category: 'งานระบบประปาและสุขาภิบาล',
      isSystem: true,
      defaultItemsJson: JSON.stringify([
        {
          name: '1. หมวดงานระบบท่อดับเพลิง (Fire Protection)',
          items: [
            { description: 'ท่อเหล็กดำ Sch.40 ขนาด 4 นิ้ว สำหรับท่อดับเพลิง Main Riser', specification: 'ASTM A53 หรือเทียบเท่า ทาสีแดงกันสนิม 2 เที่ยว', unit: 'เมตร', quantity: 60, unitPrice: 1200, notes: 'รวมข้อต่อ Grooved Coupling' },
            { description: 'หัวดับเพลิงสปริงเกลอร์ (Fire Sprinkler Head) ชนิด Pendent 68°C', specification: 'UL/FM Listed ขนาด 1/2 นิ้ว', unit: 'จุด', quantity: 30, unitPrice: 450, notes: 'รวมข้อต่อและก้านแขวน' },
          ],
        },
      ]),
    },
  });

  console.log('--- Initializing Document Sequences ---');
  await prisma.documentSequence.createMany({
    data: [
      { docType: 'QUOTATION', year: 2026, prefix: 'QT-2026-', currentSequence: 1 },
      { docType: 'BOQ', year: 2026, prefix: 'BOQ-2026-', currentSequence: 1 },
    ],
  });

  console.log('--- Creating Sample Document QT-2026-0001 with Revisions Rev.00 and Rev.01 ---');
  const doc1 = await prisma.document.create({
    data: {
      documentNumber: 'QT-2026-0001',
      documentType: 'QUOTATION',
      title: 'ใบเสนอราคางานปรับปรุงระบบปรับอากาศ VRV ชั้น 4 สยามพารากอน',
      status: 'APPROVED',
      projectId: proj1.id,
      customerId: cust1.id,
      locationId: loc1.id,
      customerName: 'บริษัท สยามพารากอน ดีเวลลอปเม้นท์ จำกัด',
      customerAddress: '991 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330',
      customerTaxId: '0105548001122',
      workingLocation: 'อาคารสยามพารากอน ชั้น 4 โซนอาหาร',
      currentRevisionNumber: 1,
      latestRevisionCode: 'Rev.01',
      version: 2,
      createdById: staffA.id,
      updatedById: staffB.id,
    },
  });

  // Rev.00 (Initial created by Staff A)
  const rev0 = await prisma.documentRevision.create({
    data: {
      documentId: doc1.id,
      revisionNumber: 0,
      revisionCode: 'Rev.00',
      revisionReason: 'ร่างใบเสนอราคาฉบับแรกตามแบบและ BOQ ของลูกค้า',
      isLatest: false,
      documentDate: new Date('2026-10-15T09:00:00Z'),
      expiryDate: new Date('2026-11-15T09:00:00Z'),
      preparedBy: 'นาย สมศักดิ์ ช่างประเมิน',
      checkedBy: 'นางสาว วิภาภรณ์ วิศวกรโครงการ',
      approvedBy: 'นาย สมชาย ผู้จัดการฝ่ายวิศวกรรม',
      paymentTerms: 'งวดที่ 1: มัดจำ 30% เมื่อเซ็นสัญญา, งวดที่ 2: 40% เมื่องานติดตั้งแล้วเสร็จ 50%, งวดที่ 3: 30% เมื่องานส่งมอบและทดสอบผ่าน',
      executionDuration: '45 วัน นับถัดจากวันที่ได้รับหนังสือแจ้งให้เริ่มงาน',
      warrantyDuration: '1 ปี นับจากวันส่งมอบงานงวดสุดท้าย',
      notes: 'ราคานี้รวมค่าขนส่ง ค่าติดตั้ง และค่ารื้อถอนอุปกรณ์เดิมแล้ว ทำงานเฉพาะกะกลางคืน',
      vatRate: 7.0,
      isVatIncluded: false,
      discountType: 'PERCENT',
      discountValue: 0.0,
      subtotal: 425000.0,
      discountAmount: 0.0,
      totalBeforeVat: 425000.0,
      vatAmount: 29750.0,
      grandTotal: 454750.0,
      thaiBahtText: 'สี่แสนห้าหมื่นสี่พันเจ็ดร้อยห้าสิบบาทถ้วน',
      createdById: staffA.id,
      createdAt: new Date('2026-10-15T09:00:00Z'),
    },
  });

  const cat1Rev0 = await prisma.boqCategory.create({
    data: {
      revisionId: rev0.id,
      name: '1. หมวดงานเครื่องปรับอากาศและอุปกรณ์หลัก',
      orderIndex: 0,
      subtotal: 284000.0,
    },
  });

  await prisma.boqItem.createMany({
    data: [
      {
        revisionId: rev0.id,
        categoryId: cat1Rev0.id,
        itemNo: 1,
        description: 'เครื่องปรับอากาศ VRV คอยล์เย็นชนิดต่อท่อลม (Ducted) 48,000 BTU',
        specification: 'Daikin FXSQ140AVM หรือเทียบเท่า พร้อมชุดรีโมทคอนโทรล',
        unit: 'ชุด',
        quantity: 2,
        unitPrice: 62000.0,
        amount: 124000.0,
        orderIndex: 0,
      },
      {
        revisionId: rev0.id,
        categoryId: cat1Rev0.id,
        itemNo: 2,
        description: 'เครื่องปรับอากาศฝังฝ้า 4 ทิศทาง (Cassette Type) 36,000 BTU',
        specification: 'Daikin FXFQ100AVM พร้อมหน้ากากและปั๊มเดรน',
        unit: 'ชุด',
        quantity: 4,
        unitPrice: 40000.0,
        amount: 160000.0,
        orderIndex: 1,
      },
    ],
  });

  const cat2Rev0 = await prisma.boqCategory.create({
    data: {
      revisionId: rev0.id,
      name: '2. หมวดงานท่อน้ำยา ท่อน้ำทิ้ง และค่าแรงติดตั้ง',
      orderIndex: 1,
      subtotal: 141000.0,
    },
  });

  await prisma.boqItem.createMany({
    data: [
      {
        revisionId: rev0.id,
        categoryId: cat2Rev0.id,
        itemNo: 3,
        description: 'ท่อน้ำยาทำความเย็นทองแดง Class M พร้อมฉนวนหนา 3/4 นิ้ว',
        specification: 'Kembla / Aeroflex พร้อมข้อต่อ Refnet Joint',
        unit: 'เมตร',
        quantity: 120,
        unitPrice: 650.0,
        amount: 78000.0,
        orderIndex: 0,
      },
      {
        revisionId: rev0.id,
        categoryId: cat2Rev0.id,
        itemNo: 4,
        description: 'ค่าแรงติดตั้ง รื้อถอนของเดิม และทดสอบระบบทำความเย็น',
        specification: 'ทีมช่างวิศวกรปรับอากาศมาตรฐานผู้ผลิต',
        unit: 'งาน',
        quantity: 1,
        unitPrice: 63000.0,
        amount: 63000.0,
        orderIndex: 1,
      },
    ],
  });

  // Rev.01 (Negotiated Revision created by Staff B)
  const rev1 = await prisma.documentRevision.create({
    data: {
      documentId: doc1.id,
      revisionNumber: 1,
      revisionCode: 'Rev.01',
      revisionReason: 'ปรับลดราคาต่อหน่วยตามการเจรจากับลูกค้า และมอบส่วนลดพิเศษ 5%',
      isLatest: true,
      documentDate: new Date('2026-10-20T14:30:00Z'),
      expiryDate: new Date('2026-11-20T14:30:00Z'),
      preparedBy: 'นางสาว วิภาภรณ์ วิศวกรโครงการ',
      checkedBy: 'นาย สมศักดิ์ ช่างประเมิน',
      approvedBy: 'นาย สมชาย ผู้จัดการฝ่ายวิศวกรรม',
      paymentTerms: 'งวดที่ 1: มัดจำ 30% เมื่อเซ็นสัญญา, งวดที่ 2: 40% เมื่องานติดตั้งแล้วเสร็จ 50%, งวดที่ 3: 30% เมื่องานส่งมอบและทดสอบผ่าน',
      executionDuration: '40 วัน นับถัดจากวันที่ได้รับหนังสือแจ้งให้เริ่มงาน (ปรับลดระยะเวลา 5 วัน)',
      warrantyDuration: '2 ปี (เพิ่มการรับประกันจาก 1 ปี)',
      notes: 'ราคานี้รวมค่าขนส่ง ค่าติดตั้ง และค่ารื้อถอนอุปกรณ์เดิมแล้ว ทำงานเฉพาะกะกลางคืน',
      vatRate: 7.0,
      isVatIncluded: false,
      discountType: 'PERCENT',
      discountValue: 5.0,
      subtotal: 410000.0,
      discountAmount: 20500.0,
      totalBeforeVat: 389500.0,
      vatAmount: 27265.0,
      grandTotal: 416765.0,
      thaiBahtText: 'สี่แสนหนึ่งหมื่นหกพันเจ็ดร้อยหกสิบห้าบาทถ้วน',
      createdById: staffB.id,
      createdAt: new Date('2026-10-20T14:30:00Z'),
    },
  });

  const cat1Rev1 = await prisma.boqCategory.create({
    data: {
      revisionId: rev1.id,
      name: '1. หมวดงานเครื่องปรับอากาศและอุปกรณ์หลัก',
      orderIndex: 0,
      subtotal: 272000.0,
    },
  });

  await prisma.boqItem.createMany({
    data: [
      {
        revisionId: rev1.id,
        categoryId: cat1Rev1.id,
        itemNo: 1,
        description: 'เครื่องปรับอากาศ VRV คอยล์เย็นชนิดต่อท่อลม (Ducted) 48,000 BTU',
        specification: 'Daikin FXSQ140AVM หรือเทียบเท่า พร้อมชุดรีโมทคอนโทรล',
        unit: 'ชุด',
        quantity: 2,
        unitPrice: 60000.0, // Reduced from 62000
        amount: 120000.0,
        notes: 'ราคาพิเศษโครงการ',
        orderIndex: 0,
      },
      {
        revisionId: rev1.id,
        categoryId: cat1Rev1.id,
        itemNo: 2,
        description: 'เครื่องปรับอากาศฝังฝ้า 4 ทิศทาง (Cassette Type) 36,000 BTU',
        specification: 'Daikin FXFQ100AVM พร้อมหน้ากากและปั๊มเดรน',
        unit: 'ชุด',
        quantity: 4,
        unitPrice: 38000.0, // Reduced from 40000
        amount: 152000.0,
        notes: 'ราคาพิเศษโครงการ',
        orderIndex: 1,
      },
    ],
  });

  const cat2Rev1 = await prisma.boqCategory.create({
    data: {
      revisionId: rev1.id,
      name: '2. หมวดงานท่อน้ำยา ท่อน้ำทิ้ง และค่าแรงติดตั้ง',
      orderIndex: 1,
      subtotal: 138000.0,
    },
  });

  await prisma.boqItem.createMany({
    data: [
      {
        revisionId: rev1.id,
        categoryId: cat2Rev1.id,
        itemNo: 3,
        description: 'ท่อน้ำยาทำความเย็นทองแดง Class M พร้อมฉนวนหนา 3/4 นิ้ว',
        specification: 'Kembla / Aeroflex พร้อมข้อต่อ Refnet Joint',
        unit: 'เมตร',
        quantity: 120,
        unitPrice: 650.0,
        amount: 78000.0,
        orderIndex: 0,
      },
      {
        revisionId: rev1.id,
        categoryId: cat2Rev1.id,
        itemNo: 4,
        description: 'ค่าแรงติดตั้ง รื้อถอนของเดิม และทดสอบระบบทำความเย็น',
        specification: 'ทีมช่างวิศวกรปรับอากาศมาตรฐานผู้ผลิต',
        unit: 'งาน',
        quantity: 1,
        unitPrice: 60000.0, // Reduced from 63000
        amount: 60000.0,
        orderIndex: 1,
      },
    ],
  });

  console.log('--- Creating Sample Document BOQ-2026-0001 ---');
  const doc2 = await prisma.document.create({
    data: {
      documentNumber: 'BOQ-2026-0001',
      documentType: 'BOQ',
      title: 'BOQ งานติดตั้งระบบไฟฟ้าสำรองฉุกเฉินและตู้ MDB รพ.กรุงเทพ',
      status: 'IN_PROGRESS',
      projectId: proj2.id,
      customerId: cust2.id,
      locationId: loc3.id,
      customerName: 'บริษัท กรุงเทพดุสิตเวชการ จำกัด (มหาชน) - รพ.กรุงเทพ',
      customerAddress: '2 ซอยศูนย์วิจัย 7 ถนนเพชรบุรีตัดใหม่ แขวงบางกะปิ เขตห้วยขวาง กรุงเทพฯ 10310',
      customerTaxId: '0107537000059',
      workingLocation: 'โรงพยาบาลกรุงเทพ อาคารผู้ป่วยนอก ชั้น B2 ห้องไฟฟ้า',
      currentRevisionNumber: 0,
      latestRevisionCode: 'Rev.00',
      version: 1,
      createdById: staffA.id,
      updatedById: staffA.id,
    },
  });

  const revDoc2 = await prisma.documentRevision.create({
    data: {
      documentId: doc2.id,
      revisionNumber: 0,
      revisionCode: 'Rev.00',
      revisionReason: 'จัดทำ BOQ ประมาณการราคางานระบบไฟฟ้าสำรองฉุกเฉิน',
      isLatest: true,
      documentDate: new Date('2026-10-25T11:00:00Z'),
      preparedBy: 'นาย สมศักดิ์ ช่างประเมิน',
      checkedBy: 'นาย ภานุมาศ ฝ่ายจัดซื้อ',
      vatRate: 7.0,
      isVatIncluded: false,
      discountType: 'AMOUNT',
      discountValue: 15000.0,
      subtotal: 540000.0,
      discountAmount: 15000.0,
      totalBeforeVat: 525000.0,
      vatAmount: 36750.0,
      grandTotal: 561750.0,
      thaiBahtText: 'ห้าแสนหกหมื่นหนึ่งพันเจ็ดร้อยห้าสิบบาทถ้วน',
      createdById: staffA.id,
      createdAt: new Date('2026-10-25T11:00:00Z'),
    },
  });

  const catDoc2 = await prisma.boqCategory.create({
    data: {
      revisionId: revDoc2.id,
      name: '1. หมวดงานตู้สวิตช์บอร์ด MDB และอุปกรณ์ควบคุม',
      orderIndex: 0,
      subtotal: 540000.0,
    },
  });

  await prisma.boqItem.createMany({
    data: [
      {
        revisionId: revDoc2.id,
        categoryId: catDoc2.id,
        itemNo: 1,
        description: 'ตู้ Main Distribution Board (MDB) พร้อม ATS Schneider 400A 4P',
        specification: 'ตู้มาตรฐาน IP54 เคลือบสี Epoxy พร้อมระบบสลับแหล่งจ่ายไฟอัตโนมัติ',
        unit: 'ตู้',
        quantity: 1,
        unitPrice: 380000.0,
        amount: 380000.0,
        orderIndex: 0,
      },
      {
        revisionId: revDoc2.id,
        categoryId: catDoc2.id,
        itemNo: 2,
        description: 'สายไฟฟ้าทองแดงทนไฟ (FRC) 1x185 sq.mm.',
        specification: 'สายทนไฟตามมาตรฐาน BS 6387 CWZ ยี่ห้อ Phelps Dodge',
        unit: 'เมตร',
        quantity: 160,
        unitPrice: 1000.0,
        amount: 160000.0,
        orderIndex: 1,
      },
    ],
  });

  console.log('--- Creating Initial Audit Logs ---');
  await prisma.auditLog.createMany({
    data: [
      {
        documentId: doc1.id,
        userId: staffA.id,
        action: 'CREATE_DOCUMENT',
        details: 'สร้างใบเสนอราคา QT-2026-0001 (Rev.00)',
        createdAt: new Date('2026-10-15T09:00:00Z'),
      },
      {
        documentId: doc1.id,
        userId: staffB.id,
        action: 'CREATE_REVISION',
        details: 'สร้าง Revision Rev.01 เหตุผล: ปรับลดราคาต่อหน่วยตามการเจรจากับลูกค้า และมอบส่วนลดพิเศษ 5%',
        createdAt: new Date('2026-10-20T14:30:00Z'),
      },
      {
        documentId: doc1.id,
        userId: admin.id,
        action: 'CHANGE_STATUS',
        details: 'เปลี่ยนสถานะเอกสารเป็น APPROVED',
        createdAt: new Date('2026-10-21T10:00:00Z'),
      },
      {
        documentId: doc2.id,
        userId: staffA.id,
        action: 'CREATE_DOCUMENT',
        details: 'สร้างเอกสาร BOQ-2026-0001 (Rev.00)',
        createdAt: new Date('2026-10-25T11:00:00Z'),
      },
    ],
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
