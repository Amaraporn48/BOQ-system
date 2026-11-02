import { NextResponse } from 'next/server';
import { getNextAvailableDocumentNumber } from '@/lib/sequence';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const docType = (searchParams.get('type') || 'BOQ') as 'QUOTATION' | 'BOQ';
    const date = searchParams.get('date') || undefined;
    const year = searchParams.get('year') || undefined;

    const documentNumber = await getNextAvailableDocumentNumber({
      docType,
      date,
      year,
    });

    return NextResponse.json({ documentNumber });
  } catch (err: any) {
    console.error('Error in next-number route:', err);
    return NextResponse.json({ error: 'Failed to generate next number' }, { status: 500 });
  }
}
