import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SAFE_SETTINGS_SELECT = {
  id: true,
  companyNameTh: true,
  companyNameEn: true,
  taxId: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  logoUrl: true,
  quotationPrefix: true,
  boqPrefix: true,
  defaultVatRate: true,
  defaultPaymentTerms: true,
  defaultWarrantyDuration: true,
  updatedAt: true,
};

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.companySettings.findUnique({
      where: { id: 'default' },
      select: SAFE_SETTINGS_SELECT,
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
      select: SAFE_SETTINGS_SELECT,
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' }, { status: 500 });
  }
}
