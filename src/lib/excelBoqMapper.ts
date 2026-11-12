import { ExcelBoqRow, createEmptyExcelRow } from '@/components/ExcelBoqGrid';

export interface MappedBoqItem {
  id?: string;
  itemNo: number;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  materialPrice: number;
  materialAmount: number;
  laborPrice: number;
  laborAmount: number;
  unitPrice: number;
  amount: number;
  notes: string;
}

export interface MappedCategory {
  name: string;
  items: MappedBoqItem[];
}

function parseNum(val: unknown): number {
  const cleaned = String(val ?? '').replace(/,/g, '').trim();
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function stripNumberPrefix(text: string): string {
  return (text || '').replace(/^\d+(\.\d+)?[\s.\-:]*/, '').trim();
}

function buildBoqItem(
  itemNo: number,
  description: string,
  row: ExcelBoqRow,
  defaultQty = 1
): MappedBoqItem {
  const q = row.quantity.trim() !== '' ? parseNum(row.quantity) : defaultQty;
  const m = parseNum(row.materialPrice);
  const l = parseNum(row.laborPrice);
  const mAmt = Math.round(q * m * 100) / 100;
  const lAmt = Math.round(q * l * 100) / 100;
  const unitPrice = Math.round((m + l) * 100) / 100;
  const amount = Math.round((mAmt + lAmt) * 100) / 100;

  return {
    itemNo,
    description,
    specification: '',
    unit: row.unit.trim() || 'JOB',
    quantity: q,
    materialPrice: m,
    materialAmount: mAmt,
    laborPrice: l,
    laborAmount: lAmt,
    unitPrice,
    amount,
    notes: '',
  };
}

/**
 * Converts spreadsheet rows from ExcelBoqGrid into structured categories/items
 * compatible with the document API and PDF print renderer.
 */
export function excelRowsToCategories(rows: ExcelBoqRow[]): MappedCategory[] {
  const nonEmptyRows = rows.filter(
    (r) =>
      r.description.trim() !== '' ||
      parseNum(r.materialPrice) > 0 ||
      parseNum(r.laborPrice) > 0
  );

  if (nonEmptyRows.length === 0) {
    return [
      {
        name: 'หมวดงานที่ 1',
        items: [
          {
            itemNo: 1,
            description: '',
            specification: '',
            unit: 'JOB',
            quantity: 1,
            materialPrice: 0,
            materialAmount: 0,
            laborPrice: 0,
            laborAmount: 0,
            unitPrice: 0,
            amount: 0,
            notes: '',
          },
        ],
      },
    ];
  }

  const groups: { catRow: ExcelBoqRow | null; subItems: ExcelBoqRow[] }[] = [];

  for (const r of nonEmptyRows) {
    if (r.rowType === 'category') {
      groups.push({ catRow: r, subItems: [] });
    } else {
      if (groups.length === 0) {
        groups.push({ catRow: null, subItems: [r] });
      } else {
        groups[groups.length - 1].subItems.push(r);
      }
    }
  }

  return groups.map((g, gIdx) => {
    const catName = g.catRow
      ? g.catRow.description.trim() || `หมวดงานที่ ${gIdx + 1}`
      : 'รายการงานและอุปกรณ์';

    if (g.subItems.length === 0 && g.catRow) {
      return {
        name: catName,
        items: [buildBoqItem(1, catName, g.catRow, 1)],
      };
    }

    const items: MappedBoqItem[] = [];
    if (
      g.catRow &&
      (parseNum(g.catRow.materialPrice) > 0 || parseNum(g.catRow.laborPrice) > 0)
    ) {
      items.push(buildBoqItem(1, catName, g.catRow, 1));
    }

    g.subItems.forEach((sub) => {
      items.push(buildBoqItem(items.length + 1, sub.description, sub, 1));
    });

    return {
      name: catName,
      items,
    };
  });
}

/**
 * Converts structured categories/items (from DB or templates) into flat rows
 * for editing inside ExcelBoqGrid.
 */
export function categoriesToExcelRows(
  categories: { name: string; items: Partial<MappedBoqItem>[] }[]
): ExcelBoqRow[] {
  if (!categories || categories.length === 0) {
    return [createEmptyExcelRow('category'), createEmptyExcelRow('item')];
  }

  const rows: ExcelBoqRow[] = [];
  let uid = 0;
  const nextId = () => `mapped_${Date.now()}_${++uid}`;

  for (const cat of categories) {
    const items = cat.items || [];
    const catTitle = (cat.name || '').trim();

    const isSingleItemCategory =
      items.length === 1 &&
      (!items[0].description?.trim() ||
        items[0].description.trim() === catTitle ||
        stripNumberPrefix(catTitle) === stripNumberPrefix(items[0].description));

    if (isSingleItemCategory) {
      const it = items[0];
      const fullDesc = [catTitle || it.description || '', it.specification?.trim() || '']
        .filter(Boolean)
        .join('\n');

      rows.push({
        id: nextId(),
        rowType: 'category',
        description: fullDesc,
        unit: it.unit || '',
        quantity: it.quantity ? String(it.quantity) : '',
        materialPrice: it.materialPrice ? String(it.materialPrice) : '',
        laborPrice: it.laborPrice ? String(it.laborPrice) : '',
      });
    } else {
      rows.push({
        id: nextId(),
        rowType: 'category',
        description: catTitle,
        unit: '',
        quantity: '',
        materialPrice: '',
        laborPrice: '',
      });

      for (const it of items) {
        const fullDesc = [it.description?.trim() || '', it.specification?.trim() || '']
          .filter(Boolean)
          .join('\n');

        rows.push({
          id: nextId(),
          rowType: 'item',
          description: fullDesc,
          unit: it.unit || 'JOB',
          quantity: it.quantity ? String(it.quantity) : '1',
          materialPrice: it.materialPrice ? String(it.materialPrice) : '',
          laborPrice: it.laborPrice ? String(it.laborPrice) : '',
        });
      }
    }
  }

  return rows.length > 0
    ? rows
    : [createEmptyExcelRow('category'), createEmptyExcelRow('item')];
}
