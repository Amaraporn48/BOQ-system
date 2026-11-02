import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const rawFilename = params.path.join('/');
    const decodedFilename = decodeURIComponent(rawFilename);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    let fileBuffer: Buffer | null = null;

    // 1. Try exact path
    try {
      fileBuffer = await fs.readFile(path.join(uploadsDir, decodedFilename));
    } catch {
      // 2. Try NFD (Mac filesystem normalization)
      try {
        fileBuffer = await fs.readFile(path.join(uploadsDir, decodedFilename.normalize('NFD')));
      } catch {
        // 3. Try NFC
        try {
          fileBuffer = await fs.readFile(path.join(uploadsDir, decodedFilename.normalize('NFC')));
        } catch {
          // 4. Fallback search inside directory
          try {
            const files = await fs.readdir(uploadsDir);
            const match = files.find(
              (f) =>
                f === decodedFilename ||
                f.normalize('NFC') === decodedFilename.normalize('NFC') ||
                f.normalize('NFD') === decodedFilename.normalize('NFD')
            );
            if (match) {
              fileBuffer = await fs.readFile(path.join(uploadsDir, match));
            }
          } catch {}
        }
      }
    }

    if (!fileBuffer) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    const ext = path.extname(decodedFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === '.xls') contentType = 'application/vnd.ms-excel';
    else if (ext === '.csv') contentType = 'text/csv; charset=utf-8';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.doc') contentType = 'application/msword';
    else if (ext === '.zip') contentType = 'application/zip';
    else if (ext === '.txt') contentType = 'text/plain; charset=utf-8';

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    };

    if (ext === '.pdf') {
      headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(path.basename(decodedFilename))}"`;
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('Error serving upload file:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
