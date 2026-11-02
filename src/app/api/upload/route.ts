import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์ที่ต้องการอัปโหลด' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const rawExt = path.extname(file.name).toLowerCase();
    const allowedExts = [
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.svg',
      '.gif',
      '.pdf',
      '.xlsx',
      '.xls',
      '.csv',
      '.doc',
      '.docx',
      '.zip',
    ];
    const ext = allowedExts.includes(rawExt) ? rawExt : '.bin';

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const prefix = ext === '.pdf' ? 'doc' : ext.includes('xls') || ext === '.csv' ? 'sheet' : 'file';
    const filename = `${prefix}-${timestamp}-${randomStr}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${filename}`,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์' }, { status: 500 });
  }
}
