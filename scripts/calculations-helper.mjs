export function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function calculateItemAmount(quantity, unitPrice) {
  const q = Number(quantity) || 0;
  const p = Number(unitPrice) || 0;
  return round2(q * p);
}

export function thaiBahtText(num) {
  if (isNaN(num)) return 'ศูนย์บาทถ้วน';
  if (num === 0) return 'ศูนย์บาทถ้วน';

  const isNegative = num < 0;
  num = Math.abs(num);

  const rounded = Math.round(num * 100) / 100;
  const parts = rounded.toFixed(2).split('.');
  const integerPart = parseInt(parts[0], 10);
  const decimalPart = parseInt(parts[1], 10);

  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  function readMillionBlock(block) {
    if (block === 0) return '';
    let result = '';
    const str = block.toString();
    const len = str.length;

    for (let i = 0; i < len; i++) {
      const digit = parseInt(str[i], 10);
      const pos = len - i - 1;

      if (digit === 0) continue;

      if (pos === 0) {
        if (digit === 1 && len > 1 && parseInt(str[len - 2], 10) !== 0) {
          result += 'เอ็ด';
        } else {
          result += digits[digit];
        }
      } else if (pos === 1) {
        if (digit === 1) {
          result += 'สิบ';
        } else if (digit === 2) {
          result += 'ยี่สิบ';
        } else {
          result += digits[digit] + 'สิบ';
        }
      } else {
        result += digits[digit] + units[pos];
      }
    }
    return result;
  }

  function readFullInteger(val) {
    if (val === 0) return 'ศูนย์';
    let result = '';
    let millionsCount = 0;

    while (val > 0) {
      const chunk = val % 1000000;
      if (chunk > 0) {
        const text = readMillionBlock(chunk);
        const millionSuffix = 'ล้าน'.repeat(millionsCount);
        result = text + millionSuffix + result;
      }
      val = Math.floor(val / 1000000);
      millionsCount++;
    }

    return result;
  }

  let text = '';
  if (isNegative) text += 'ลบ';

  if (integerPart > 0) {
    text += readFullInteger(integerPart) + 'บาท';
  } else {
    text += 'ศูนย์บาท';
  }

  if (decimalPart === 0) {
    text += 'ถ้วน';
  } else {
    text += readMillionBlock(decimalPart) + 'สตางค์';
  }

  return text;
}

export function calculateDocumentTotals(input) {
  const vatRate = Number(input.vatRate) || 0;
  const isVatIncluded = Boolean(input.isVatIncluded);
  const discountValue = Number(input.discountValue) || 0;

  const rawSum = input.items.reduce((sum, item) => {
    return sum + calculateItemAmount(item.quantity, item.unitPrice);
  }, 0);
  const subtotal = round2(rawSum);

  let discountAmount = 0;
  if (input.discountType === 'PERCENT') {
    discountAmount = round2((subtotal * Math.max(0, Math.min(100, discountValue))) / 100);
  } else {
    discountAmount = round2(Math.min(subtotal, Math.max(0, discountValue)));
  }

  const afterDiscount = round2(Math.max(0, subtotal - discountAmount));

  let totalBeforeVat = 0;
  let vatAmount = 0;
  let grandTotal = 0;

  if (vatRate <= 0) {
    totalBeforeVat = afterDiscount;
    vatAmount = 0;
    grandTotal = afterDiscount;
  } else if (isVatIncluded) {
    grandTotal = afterDiscount;
    totalBeforeVat = round2(grandTotal / (1 + vatRate / 100));
    vatAmount = round2(grandTotal - totalBeforeVat);
  } else {
    totalBeforeVat = afterDiscount;
    vatAmount = round2((totalBeforeVat * vatRate) / 100);
    grandTotal = round2(totalBeforeVat + vatAmount);
  }

  return {
    subtotal,
    discountAmount,
    totalBeforeVat,
    vatAmount,
    grandTotal,
    thaiBahtText: thaiBahtText(grandTotal),
  };
}
