import { thaiBahtText } from './bahttext';
export { thaiBahtText };

export interface BoqItemCalcInput {
  quantity: number;
  unitPrice?: number;
  materialPrice?: number;
  laborPrice?: number;
}

export interface DocumentTotalsInput {
  items: BoqItemCalcInput[];
  vatRate: number; // e.g. 7.0 or 0
  isVatIncluded?: boolean; // true = tax inclusive, false = tax exclusive
  discountType?: 'PERCENT' | 'AMOUNT';
  discountValue?: number;
  overheadRate?: number; // % เช่น 10% ค่าดำเนินการและผลกำไร
}

export interface DocumentTotalsResult {
  materialTotal: number;
  laborTotal: number;
  subtotal: number; // ค่าใช้จ่ายทั้งหมด
  discountAmount: number;
  afterDiscount: number;
  overheadRate: number;
  overheadAmount: number; // ค่าดำเนินการและผลกำไร
  totalBeforeVat: number; // ราคารวมทั้งหมด
  vatAmount: number; // ภาษีมูลค่าเพิ่ม 7%
  grandTotal: number; // รวมยอดเงินทั้งหมด
  thaiBahtText: string;
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateItemAmount(
  quantity: number,
  materialPrice: number = 0,
  laborPrice: number = 0,
  unitPrice?: number
): { materialAmount: number; laborAmount: number; totalAmount: number } {
  const q = Math.max(0, Number(quantity) || 0);
  const m = Math.max(0, Number(materialPrice) || 0);
  const l = Math.max(0, Number(laborPrice) || 0);

  const materialAmount = round2(q * m);
  const laborAmount = round2(q * l);

  let totalAmount = round2(materialAmount + laborAmount);
  if (totalAmount === 0 && unitPrice) {
    totalAmount = round2(q * Math.max(0, Number(unitPrice) || 0));
  }

  return { materialAmount, laborAmount, totalAmount };
}

export function calculateDocumentTotals(input: DocumentTotalsInput): DocumentTotalsResult {
  const vatRate = Math.max(0, Number(input.vatRate) || 0);
  const isVatIncluded = Boolean(input.isVatIncluded);
  const discountValue = Math.max(0, Number(input.discountValue) || 0);
  const overheadRate = Math.max(0, Number(input.overheadRate) || 0);

  let materialTotal = 0;
  let laborTotal = 0;
  let rawSum = 0;

  input.items.forEach((item) => {
    const q = Math.max(0, Number(item.quantity) || 0);
    const m = Math.max(0, Number(item.materialPrice) || 0);
    const l = Math.max(0, Number(item.laborPrice) || 0);
    const u = Math.max(0, Number(item.unitPrice) || 0);

    const calc = calculateItemAmount(q, m, l, u);
    materialTotal += calc.materialAmount;
    laborTotal += calc.laborAmount;
    rawSum += calc.totalAmount;
  });

  materialTotal = round2(materialTotal);
  laborTotal = round2(laborTotal);
  const subtotal = round2(rawSum);

  let discountAmount = 0;
  if (input.discountType === 'AMOUNT') {
    discountAmount = round2(Math.min(subtotal, Math.max(0, discountValue)));
  } else {
    discountAmount = round2((subtotal * Math.max(0, Math.min(100, discountValue))) / 100);
  }

  const afterDiscount = round2(Math.max(0, subtotal - discountAmount));

  // Overhead & Profit (ค่าดำเนินการและผลกำไร)
  const overheadAmount = round2((afterDiscount * Math.max(0, overheadRate)) / 100);

  // Price with Overhead before VAT
  const baseForTax = round2(afterDiscount + overheadAmount);

  let totalBeforeVat = 0;
  let vatAmount = 0;
  let grandTotal = 0;

  if (vatRate <= 0) {
    totalBeforeVat = baseForTax;
    vatAmount = 0;
    grandTotal = baseForTax;
  } else if (isVatIncluded) {
    // Price includes VAT
    grandTotal = baseForTax;
    totalBeforeVat = round2(grandTotal / (1 + vatRate / 100));
    vatAmount = round2(grandTotal - totalBeforeVat);
  } else {
    // Price excludes VAT (VAT is added on top)
    totalBeforeVat = baseForTax;
    vatAmount = round2((totalBeforeVat * vatRate) / 100);
    grandTotal = round2(totalBeforeVat + vatAmount);
  }

  return {
    materialTotal,
    laborTotal,
    subtotal,
    discountAmount,
    afterDiscount,
    overheadRate,
    overheadAmount,
    totalBeforeVat,
    vatAmount,
    grandTotal,
    thaiBahtText: thaiBahtText(grandTotal),
  };
}
