import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';

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

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const rawFilename = params.path.join('/');
    const decodedFilename = decodeURIComponent(rawFilename);
    const basename = path.basename(decodedFilename);

    let fileBuffer: Buffer | null = null;
    let contentType = getMimeType(basename);
    let downloadFilename = basename;

    // 1. Try fetching from Cloud Database (Neon PostgreSQL)
    try {
      const dbFile = await prisma.uploadedFile.findFirst({
        where: {
          OR: [
            { filename: basename },
            { filename: decodedFilename },
          ],
        },
      });

      if (dbFile && dbFile.data) {
        fileBuffer = Buffer.from(dbFile.data);
        contentType = dbFile.mimeType || getMimeType(dbFile.filename);
        downloadFilename = dbFile.originalName || dbFile.filename;
      }
    } catch (dbErr) {
      console.warn('Database lookup for file failed, falling back to disk:', dbErr);
    }

    // 2. Fallback to local disk (for static seed images / dev uploads)
    if (!fileBuffer) {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      try {
        fileBuffer = await fs.readFile(path.join(uploadsDir, decodedFilename));
      } catch {
        try {
          fileBuffer = await fs.readFile(path.join(uploadsDir, decodedFilename.normalize('NFD')));
        } catch {
          try {
            fileBuffer = await fs.readFile(path.join(uploadsDir, decodedFilename.normalize('NFC')));
          } catch {
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
    }

    if (!fileBuffer) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    const ext = path.extname(downloadFilename).toLowerCase();
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    if (ext === '.pdf') {
      headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(downloadFilename)}"`;
    } else if (
      ext === '.xlsx' ||
      ext === '.xls' ||
      ext === '.doc' ||
      ext === '.docx' ||
      ext === '.zip'
    ) {
      headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(downloadFilename)}"`;
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
