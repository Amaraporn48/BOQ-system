import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';

export const dynamic = 'force-dynamic';

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.svg': return 'image/svg+xml';
    case '.gif': return 'image/gif';
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.xls': return 'application/vnd.ms-excel';
    case '.csv': return 'text/csv; charset=utf-8';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.doc': return 'application/msword';
    case '.zip': return 'application/zip';
    case '.txt': return 'text/plain; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์ที่ต้องการอัปโหลด' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

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
      '.txt',
    ];
    const ext = allowedExts.includes(rawExt) ? rawExt : '.bin';

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const prefix = ext === '.pdf' ? 'doc' : ext.includes('xls') || ext === '.csv' ? 'sheet' : 'file';
    const filename = `${prefix}-${timestamp}-${randomStr}${ext}`;
    const mimeType = file.type || getMimeType(filename);

    // 1. If Vercel Blob token is configured, use Vercel Blob Storage
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(filename, file, { access: 'public' });
        return NextResponse.json({
          success: true,
          url: blob.url,
          name: file.name,
          size: file.size,
        });
      } catch (blobErr) {
        console.error('Vercel Blob upload failed, falling back to database:', blobErr);
      }
    }

    // 2. Save directly to Cloud PostgreSQL database (Neon)
    try {
      await prisma.uploadedFile.create({
        data: {
          filename,
          originalName: file.name,
          mimeType,
          size: file.size,
          data: buffer,
        },
      });
    } catch (dbErr) {
      console.error('Database file save error:', dbErr);
      throw dbErr;
    }

    // 3. Optional local filesystem write (for local dev cache)
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(path.join(uploadsDir, filename), buffer);
    } catch {
      // Ignored on read-only environments like Vercel
    }

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
