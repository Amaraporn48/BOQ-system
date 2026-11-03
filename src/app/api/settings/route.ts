import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.companySettings.findUnique({
      where: { id: 'default' },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการโหลดการตั้งค่า' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถแก้ไขการตั้งค่าได้' }, { status: 403 });
    }

    const body = await request.json();

    const settings = await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: {
        companyNameTh: body.companyNameTh,
        companyNameEn: body.companyNameEn,
        taxId: body.taxId,
        address: body.address,
        phone: body.phone,
        email: body.email,
        website: body.website,
        logoUrl: body.logoUrl,
        quotationPrefix: body.quotationPrefix,
        boqPrefix: body.boqPrefix,
        defaultVatRate: Number(body.defaultVatRate) || 7.0,
        defaultPaymentTerms: body.defaultPaymentTerms,
        defaultWarrantyDuration: body.defaultWarrantyDuration,
        geminiApiKey: body.geminiApiKey !== undefined ? (body.geminiApiKey || null) : undefined,
      },
      create: {
        id: 'default',
        companyNameTh: body.companyNameTh || 'บริษัท สยามวิศวกรรมและรับเหมาก่อสร้าง จำกัด',
        companyNameEn: body.companyNameEn || 'Siam Engineering & Construction Co., Ltd.',
        taxId: body.taxId || '0105559012345',
        address: body.address || '',
        phone: body.phone || '',
        email: body.email || '',
        website: body.website || '',
        logoUrl: body.logoUrl || null,
        quotationPrefix: body.quotationPrefix || 'QT',
        boqPrefix: body.boqPrefix || 'BOQ',
        defaultVatRate: Number(body.defaultVatRate) || 7.0,
        defaultPaymentTerms: body.defaultPaymentTerms || '',
        defaultWarrantyDuration: body.defaultWarrantyDuration || '',
        geminiApiKey: body.geminiApiKey || null,
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' }, { status: 500 });
  }
}
