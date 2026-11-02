import { prisma } from './prisma';

export interface NextNumberOptions {
  docType?: 'QUOTATION' | 'BOQ';
  date?: string | Date;
  year?: string | number;
}

/**
 * Calculates the next available document number continuously in the format:
 * TW-[YY]-[NNN] (e.g. TW-67-001, TW-67-112, TW-69-001)
 *
 * If any document is deleted or has a gap, it fills in sequentially
 * without skipping numbers.
 */
export async function getNextAvailableDocumentNumber(
  optionsOrDocType?: 'QUOTATION' | 'BOQ' | NextNumberOptions,
  dateOrYear?: string | Date | number
): Promise<string> {
  let docType: 'QUOTATION' | 'BOQ' = 'BOQ';
  let date: string | Date | undefined;
  let year: string | number | undefined;

  if (typeof optionsOrDocType === 'string') {
    docType = optionsOrDocType;
    if (
      typeof dateOrYear === 'number' ||
      (typeof dateOrYear === 'string' && dateOrYear.length <= 4 && !dateOrYear.includes('-'))
    ) {
      year = dateOrYear;
    } else if (dateOrYear) {
      date = dateOrYear as string | Date;
    }
  } else if (optionsOrDocType && typeof optionsOrDocType === 'object') {
    if (optionsOrDocType.docType) docType = optionsOrDocType.docType;
    date = optionsOrDocType.date;
    year = optionsOrDocType.year;
  }

  // Calculate 2-digit Thai Buddhist Era year (e.g. 2567 -> 67, 2569 -> 69)
  let thaiYear2Digits: string;
  if (year !== undefined && year !== null && String(year).trim() !== '') {
    const yStr = String(year).trim();
    const yNum = parseInt(yStr, 10);
    if (yStr.length === 2) {
      thaiYear2Digits = yStr;
    } else if (!isNaN(yNum)) {
      if (yNum > 2400) {
        thaiYear2Digits = String(yNum).slice(-2);
      } else {
        thaiYear2Digits = String(yNum + 543).slice(-2);
      }
    } else {
      thaiYear2Digits = String(new Date().getFullYear() + 543).slice(-2);
    }
  } else if (date) {
    const d = new Date(date);
    const fullYear = isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
    thaiYear2Digits = String(fullYear + 543).slice(-2);
  } else {
    thaiYear2Digits = String(new Date().getFullYear() + 543).slice(-2);
  }

  const prefix = 'TW';
  const prefixPattern = `${prefix}-${thaiYear2Digits}-`;

  // Query all existing documents matching this prefix pattern
  const existingDocs = await prisma.document.findMany({
    where: {
      documentNumber: {
        startsWith: prefixPattern,
      },
    },
    select: { documentNumber: true },
  });

  const usedNumbers = new Set<number>();
  for (const doc of existingDocs) {
    const suffix = doc.documentNumber.slice(prefixPattern.length);
    const parsed = parseInt(suffix, 10);
    if (!isNaN(parsed) && parsed > 0) {
      usedNumbers.add(parsed);
    }
  }

  let nextSeq = 1;
  if (usedNumbers.size > 0) {
    const nums = Array.from(usedNumbers);
    const min = Math.min(...nums);
    const max = Math.max(...nums);

    if (min > 10) {
      // Sequence with a starting offset (e.g. legacy documents like TW-67-112)
      let foundGap = false;
      for (let i = min; i <= max; i++) {
        if (!usedNumbers.has(i)) {
          nextSeq = i;
          foundGap = true;
          break;
        }
      }
      if (!foundGap) {
        nextSeq = max + 1;
      }
    } else {
      // Normal sequence starting from 1 (fills gaps sequentially: 1, 2, 3...)
      let i = 1;
      while (usedNumbers.has(i)) {
        i++;
      }
      nextSeq = i;
    }
  } else {
    nextSeq = 1;
  }

  const formattedSeq = String(nextSeq).padStart(3, '0');
  return `${prefixPattern}${formattedSeq}`;
}

export async function generateDocumentNumber(
  optionsOrDocType?: 'QUOTATION' | 'BOQ' | NextNumberOptions,
  dateOrYear?: string | Date | number
): Promise<string> {
  return getNextAvailableDocumentNumber(optionsOrDocType, dateOrYear);
}
