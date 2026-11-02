/**
 * Converts a numeric amount to Thai Baht text representation
 * e.g. 125000.50 -> "หนึ่งแสนสองหมื่นห้าพันบาทห้าสิบสตางค์"
 */
export function thaiBahtText(num: number): string {
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

  function readMillionBlock(block: number): string {
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

  function readFullInteger(val: number): string {
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
