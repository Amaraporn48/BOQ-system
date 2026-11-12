'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  ClipboardPaste,
  CornerDownLeft,
  ListTree,
  FolderPlus,
  Sparkles,
  Download,
  Calculator,
  Check,
} from 'lucide-react';

export interface ExcelBoqRow {
  id: string;
  rowType: 'category' | 'item';
  description: string;
  unit: string;
  quantity: string; // keep as string while editing for natural Excel typing
  materialPrice: string;
  laborPrice: string;
}

interface ExcelBoqGridProps {
  rows: ExcelBoqRow[];
  onChange: (rows: ExcelBoqRow[]) => void;
  showRowTypeColumn?: boolean;
}

type ColKey =
  | 'items'
  | 'description'
  | 'unit'
  | 'quantity'
  | 'materialPrice'
  | 'materialAmount'
  | 'laborPrice'
  | 'laborAmount'
  | 'total';

const COLUMNS: {
  key: ColKey;
  letter: string;
  label: string;
  editable: boolean;
  align: 'left' | 'center' | 'right';
}[] = [
  { key: 'items', letter: 'A', label: 'Items', editable: false, align: 'center' },
  { key: 'description', letter: 'B', label: 'Description', editable: true, align: 'left' },
  { key: 'unit', letter: 'C', label: 'Unit', editable: true, align: 'center' },
  { key: 'quantity', letter: 'D', label: 'Quantity', editable: true, align: 'right' },
  { key: 'materialPrice', letter: 'E', label: 'Mat. Qty/Price', editable: true, align: 'right' },
  { key: 'materialAmount', letter: 'F', label: 'Mat. Amount', editable: false, align: 'right' },
  { key: 'laborPrice', letter: 'G', label: 'Lab. Qty/Price', editable: true, align: 'right' },
  { key: 'laborAmount', letter: 'H', label: 'Lab. Amount', editable: false, align: 'right' },
  { key: 'total', letter: 'I', label: 'Total', editable: false, align: 'right' },
];

const EDITABLE_COL_INDICES = COLUMNS.map((c, idx) => (c.editable ? idx : -1)).filter((i) => i !== -1);

export function createEmptyExcelRow(rowType: 'category' | 'item' = 'item'): ExcelBoqRow {
  return {
    id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    rowType,
    description: '',
    unit: rowType === 'category' ? '' : 'JOB',
    quantity: rowType === 'category' ? '' : '1',
    materialPrice: '',
    laborPrice: '',
  };
}

function parseNum(val: string): number {
  const cleaned = String(val || '').replace(/,/g, '').trim();
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatMoney(n: number): string {
  if (!n || n === 0) return '-';
  return n.toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

export function ExcelBoqGrid({ rows, onChange }: ExcelBoqGridProps) {
  const [activeCell, setActiveCell] = useState<{ row: number; col: number }>({ row: 0, col: 1 });
  const [selectionRange, setSelectionRange] = useState<{
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedSum, setCopiedSum] = useState(false);
  const [focusedNumericCell, setFocusedNumericCell] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    rowIndex: number;
  } | null>(null);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const cellRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const isDraggingRef = useRef(false);
  const skipFocusCollapseRef = useRef(false);

  // Compute category numbers (1, 2, 3...) and calculated amounts per row
  const computedRows = useMemo(() => {
    let catCounter = 0;
    return rows.map((r) => {
      const itemNo = r.rowType === 'category' ? String(++catCounter) : '';
      const q = parseNum(r.quantity);
      const mp = parseNum(r.materialPrice);
      const lp = parseNum(r.laborPrice);
      const mAmt = Math.round(q * mp * 100) / 100;
      const lAmt = Math.round(q * lp * 100) / 100;
      const total = Math.round((mAmt + lAmt) * 100) / 100;
      return { itemNo, q, mp, lp, mAmt, lAmt, total };
    });
  }, [rows]);

  // Normalized selection bounds + live Excel-style Sum / Count / Average
  const selectionBounds = useMemo(() => {
    if (!selectionRange || rows.length === 0) return null;
    const minRow = Math.max(0, Math.min(selectionRange.startRow, selectionRange.endRow));
    const maxRow = Math.min(rows.length - 1, Math.max(selectionRange.startRow, selectionRange.endRow));
    const minCol = Math.max(0, Math.min(selectionRange.startCol, selectionRange.endCol));
    const maxCol = Math.min(COLUMNS.length - 1, Math.max(selectionRange.startCol, selectionRange.endCol));
    const isMulti = minRow !== maxRow || minCol !== maxCol;
    return { minRow, maxRow, minCol, maxCol, isMulti };
  }, [selectionRange, rows.length]);

  const selectionStats = useMemo(() => {
    if (!selectionBounds) {
      return {
        isMulti: false,
        rangeLabel: '',
        cellCount: 0,
        numericCount: 0,
        sum: 0,
        avg: 0,
        min: 0,
        max: 0,
      };
    }

    const { minRow, maxRow, minCol, maxCol, isMulti } = selectionBounds;
    const startColLetter = COLUMNS[minCol]?.letter || 'A';
    const endColLetter = COLUMNS[maxCol]?.letter || 'A';
    const rangeLabel = isMulti
      ? `${startColLetter}${minRow + 1}:${endColLetter}${maxRow + 1}`
      : `${startColLetter}${minRow + 1}`;

    let cellCount = 0;
    let numericCount = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let r = minRow; r <= maxRow; r++) {
      const rowObj = rows[r];
      const comp = computedRows[r];
      if (!rowObj || !comp) continue;

      for (let c = minCol; c <= maxCol; c++) {
        cellCount++;
        const colKey = COLUMNS[c]?.key;
        let val: number | null = null;

        if (colKey === 'quantity') {
          if (rowObj.quantity.trim() !== '' && !isNaN(Number(rowObj.quantity.replace(/,/g, '')))) {
            val = comp.q;
          }
        } else if (colKey === 'materialPrice') {
          if (rowObj.materialPrice.trim() !== '' && !isNaN(Number(rowObj.materialPrice.replace(/,/g, '')))) {
            val = comp.mp;
          }
        } else if (colKey === 'materialAmount') {
          if (comp.mAmt > 0) val = comp.mAmt;
        } else if (colKey === 'laborPrice') {
          if (rowObj.laborPrice.trim() !== '' && !isNaN(Number(rowObj.laborPrice.replace(/,/g, '')))) {
            val = comp.lp;
          }
        } else if (colKey === 'laborAmount') {
          if (comp.lAmt > 0) val = comp.lAmt;
        } else if (colKey === 'total') {
          if (comp.total > 0) val = comp.total;
        }

        if (val !== null) {
          numericCount++;
          sum = Math.round((sum + val) * 100) / 100;
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
    }

    const avg = numericCount > 0 ? Math.round((sum / numericCount) * 100) / 100 : 0;
    return {
      isMulti,
      rangeLabel,
      cellCount,
      numericCount,
      sum,
      avg,
      min: numericCount > 0 ? min : 0,
      max: numericCount > 0 ? max : 0,
    };
  }, [selectionBounds, rows, computedRows]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    const stopDragging = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };
    window.addEventListener('click', closeMenu);
    window.addEventListener('mouseup', stopDragging);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('mouseup', stopDragging);
    };
  }, []);

  const focusCell = (row: number, col: number, preserveSelection = false) => {
    const boundedRow = Math.max(0, Math.min(rows.length - 1, row));
    const boundedCol = Math.max(0, Math.min(COLUMNS.length - 1, col));
    setActiveCell({ row: boundedRow, col: boundedCol });
    if (!preserveSelection) {
      setSelectionRange({
        startRow: boundedRow,
        startCol: boundedCol,
        endRow: boundedRow,
        endCol: boundedCol,
      });
    } else {
      skipFocusCollapseRef.current = true;
    }

    requestAnimationFrame(() => {
      const key = `${boundedRow}-${boundedCol}`;
      const el = cellRefs.current[key];
      if (el) {
        el.focus();
      }
      skipFocusCollapseRef.current = false;
    });
  };

  const handleCellFocus = (rIdx: number, cIdx: number) => {
    setActiveCell({ row: rIdx, col: cIdx });
    if (skipFocusCollapseRef.current || isDraggingRef.current) return;
    setSelectionRange({
      startRow: rIdx,
      startCol: cIdx,
      endRow: rIdx,
      endCol: cIdx,
    });
  };

  const handleCellMouseDown = (
    e: React.MouseEvent,
    rIdx: number,
    cIdx: number,
    isReadOnlyCol: boolean
  ) => {
    if (e.button !== 0) return;

    if (e.shiftKey) {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      setSelectionRange({
        startRow: activeCell.row,
        startCol: activeCell.col,
        endRow: rIdx,
        endCol: cIdx,
      });
      return;
    }

    if (isReadOnlyCol) {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      isDraggingRef.current = true;
      setIsDragging(true);
      skipFocusCollapseRef.current = true;
      setSelectionRange({
        startRow: rIdx,
        startCol: cIdx,
        endRow: rIdx,
        endCol: cIdx,
      });
      setActiveCell({ row: rIdx, col: cIdx });
      const el = cellRefs.current[`${rIdx}-${cIdx}`];
      if (el) el.focus();
      requestAnimationFrame(() => {
        skipFocusCollapseRef.current = false;
      });
    } else {
      isDraggingRef.current = true;
      setIsDragging(true);
      setSelectionRange({
        startRow: rIdx,
        startCol: cIdx,
        endRow: rIdx,
        endCol: cIdx,
      });
    }
  };

  const handleCellMouseEnter = (rIdx: number, cIdx: number) => {
    if (!isDraggingRef.current) return;
    setSelectionRange((prev) => {
      const startRow = prev?.startRow ?? activeCell.row;
      const startCol = prev?.startCol ?? activeCell.col;
      if (prev && prev.endRow === rIdx && prev.endCol === cIdx) return prev;
      if (rIdx !== startRow || cIdx !== startCol) {
        window.getSelection()?.removeAllRanges();
        // Blur editable input when expanding across multiple cells so drag highlight looks like Excel
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          activeEl.blur();
        }
      }
      return { startRow, startCol, endRow: rIdx, endCol: cIdx };
    });
  };

  const updateRowField = (rowIndex: number, key: keyof ExcelBoqRow, value: any) => {
    const next = [...rows];
    next[rowIndex] = { ...next[rowIndex], [key]: value };
    onChange(next);
  };

  const insertRowAt = (index: number, rowType: 'category' | 'item') => {
    const next = [...rows];
    next.splice(index, 0, createEmptyExcelRow(rowType));
    onChange(next);
    requestAnimationFrame(() => focusCell(index, 1));
  };

  const duplicateRowAt = (index: number) => {
    const src = rows[index];
    if (!src) return;
    const copy: ExcelBoqRow = {
      ...src,
      id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    const next = [...rows];
    next.splice(index + 1, 0, copy);
    onChange(next);
    requestAnimationFrame(() => focusCell(index + 1, activeCell.col));
  };

  const removeRowAt = (index: number) => {
    if (rows.length <= 1) {
      onChange([createEmptyExcelRow('category')]);
      return;
    }
    const next = rows.filter((_, i) => i !== index);
    onChange(next);
    focusCell(Math.min(index, next.length - 1), activeCell.col);
  };

  const moveRow = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
    focusCell(target, activeCell.col);
  };

  const toggleRowType = (index: number) => {
    const cur = rows[index];
    if (!cur) return;
    const nextType = cur.rowType === 'category' ? 'item' : 'category';
    updateRowField(index, 'rowType', nextType);
  };

  // Excel-style multi-cell paste (supports TSV copied from Excel / Google Sheets)
  const handleCellPaste = (
    e: React.ClipboardEvent,
    startRow: number,
    startCol: number
  ) => {
    const raw = e.clipboardData.getData('text/plain');
    if (!raw) return;

    const hasTabs = raw.includes('\t');
    const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    // Remove trailing empty line commonly added by Excel copy
    if (lines.length > 1 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    // Only hijack paste if multi-row or multi-column (tab-separated)
    if (lines.length <= 1 && !hasTabs) {
      return;
    }

    e.preventDefault();
    const next = [...rows];

    lines.forEach((line, rOffset) => {
      const targetRowIdx = startRow + rOffset;
      while (next.length <= targetRowIdx) {
        next.push(createEmptyExcelRow('item'));
      }

      const cells = line.split('\t');
      const rowObj = { ...next[targetRowIdx] };

      // Smart Excel paste: if pasting starting at column A (Items) and cell 0 looks like a number (e.g. "1", "2")
      let colCursor = startCol;
      let cellStartIndex = 0;

      if (startCol === 0 && cells.length >= 2) {
        const firstCol = cells[0].trim();
        if (/^\d+(\.\d+)?$/.test(firstCol)) {
          rowObj.rowType = 'category';
        } else if (!firstCol) {
          rowObj.rowType = 'item';
        }
        colCursor = 1;
        cellStartIndex = 1;
      }

      for (let cOffset = cellStartIndex; cOffset < cells.length; cOffset++) {
        const gridColIdx = colCursor + (cOffset - cellStartIndex);
        if (gridColIdx >= COLUMNS.length) break;
        const colKey = COLUMNS[gridColIdx].key;
        const val = cells[cOffset].trim();

        if (colKey === 'description') {
          // Auto-detect category vs sub-item when pasting into Description
          if (val.startsWith('-')) {
            rowObj.rowType = 'item';
            rowObj.description = val;
          } else {
            rowObj.description = val;
          }
        } else if (colKey === 'unit') {
          rowObj.unit = val;
        } else if (colKey === 'quantity') {
          rowObj.quantity = val === '-' ? '' : val.replace(/,/g, '');
        } else if (colKey === 'materialPrice') {
          rowObj.materialPrice = val === '-' ? '' : val.replace(/,/g, '');
        } else if (colKey === 'laborPrice') {
          rowObj.laborPrice = val === '-' ? '' : val.replace(/,/g, '');
        }
      }

      next[targetRowIdx] = rowObj;
    });

    onChange(next);
    setPasteNotice(`วางข้อมูลจาก Excel สำเร็จ ${lines.length} แถว!`);
    setTimeout(() => setPasteNotice(null), 3000);
  };

  // Excel keyboard navigation inside inputs/textareas
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    const colDef = COLUMNS[colIndex];
    const el = e.currentTarget;
    const selStart = el.selectionStart ?? 0;
    const selEnd = el.selectionEnd ?? 0;
    const valLen = el.value.length;

    // Enter: move to next row (or Shift/Alt+Enter for newline inside description)
    if (e.key === 'Enter') {
      if (colDef.key === 'description' && (e.shiftKey || e.altKey)) {
        return; // allow newline in description
      }
      e.preventDefault();
      if (rowIndex === rows.length - 1) {
        const next = [...rows, createEmptyExcelRow('item')];
        onChange(next);
        requestAnimationFrame(() => focusCell(rowIndex + 1, colIndex));
      } else {
        focusCell(rowIndex + 1, colIndex);
      }
      return;
    }

    // Tab / Shift+Tab: jump across editable columns
    if (e.key === 'Tab') {
      e.preventDefault();
      const editablePos = EDITABLE_COL_INDICES.indexOf(colIndex);
      if (!e.shiftKey) {
        if (editablePos >= 0 && editablePos < EDITABLE_COL_INDICES.length - 1) {
          focusCell(rowIndex, EDITABLE_COL_INDICES[editablePos + 1]);
        } else if (rowIndex < rows.length - 1) {
          focusCell(rowIndex + 1, EDITABLE_COL_INDICES[0]);
        } else {
          const next = [...rows, createEmptyExcelRow('item')];
          onChange(next);
          requestAnimationFrame(() => focusCell(rowIndex + 1, EDITABLE_COL_INDICES[0]));
        }
      } else {
        if (editablePos > 0) {
          focusCell(rowIndex, EDITABLE_COL_INDICES[editablePos - 1]);
        } else if (rowIndex > 0) {
          focusCell(rowIndex - 1, EDITABLE_COL_INDICES[EDITABLE_COL_INDICES.length - 1]);
        }
      }
      return;
    }

    // ArrowUp / ArrowDown
    if (e.key === 'ArrowUp') {
      // In multiline textarea, only move row if caret is on the first line
      if (el.tagName === 'TEXTAREA') {
        const textBeforeCaret = el.value.slice(0, selStart);
        if (textBeforeCaret.includes('\n')) return;
      }
      e.preventDefault();
      focusCell(rowIndex - 1, colIndex);
      return;
    }

    if (e.key === 'ArrowDown') {
      // In multiline textarea, only move row if caret is on the last line
      if (el.tagName === 'TEXTAREA') {
        const textAfterCaret = el.value.slice(selEnd);
        if (textAfterCaret.includes('\n')) return;
      }
      e.preventDefault();
      focusCell(rowIndex + 1, colIndex);
      return;
    }

    // ArrowLeft / ArrowRight when at caret boundaries
    if (e.key === 'ArrowLeft' && selStart === 0 && selEnd === 0) {
      e.preventDefault();
      focusCell(rowIndex, colIndex - 1);
      return;
    }

    if (e.key === 'ArrowRight' && selStart === valLen && selEnd === valLen) {
      e.preventDefault();
      focusCell(rowIndex, colIndex + 1);
      return;
    }
  };

  // Export grid rows back to TSV so users can copy directly into Excel
  const handleCopyAllToClipboard = async () => {
    const tsv = rows
      .map((r, i) => {
        const comp = computedRows[i];
        return [
          comp.itemNo,
          r.description.replace(/\n/g, ' '),
          r.unit,
          r.quantity,
          r.materialPrice,
          comp.mAmt || '',
          r.laborPrice,
          comp.lAmt || '',
          comp.total || '',
        ].join('\t');
      })
      .join('\n');

    try {
      await navigator.clipboard.writeText(tsv);
      setPasteNotice('คัดลอกตารางทั้งหมดเรียบร้อย! นำไปวางใน Excel (Ctrl+V) ได้เลย');
      setTimeout(() => setPasteNotice(null), 3000);
    } catch {
      alert('ไม่สามารถคัดลอกอัตโนมัติได้');
    }
  };

  const handleCopySum = async () => {
    if (!selectionStats.numericCount) return;
    try {
      await navigator.clipboard.writeText(String(selectionStats.sum));
      setCopiedSum(true);
      setTimeout(() => setCopiedSum(false), 1800);
    } catch {
      // ignore clipboard errors silently
    }
  };

  const activeColDef = COLUMNS[activeCell.col] || COLUMNS[1];
  const activeRowObj = rows[activeCell.row];
  const activeComp = computedRows[activeCell.row];
  const activeCellRefLabel = selectionStats.isMulti
    ? selectionStats.rangeLabel
    : `${activeColDef.letter}${activeCell.row + 1}`;

  const getFormulaBarDisplay = () => {
    if (!activeRowObj || !activeComp) return '';
    switch (activeColDef.key) {
      case 'items':
        return activeRowObj.rowType === 'category'
          ? `=AUTO_ITEM_NO()  // ลำดับหัวข้อหลัก (${activeComp.itemNo})`
          : '(แถวรายการย่อย - ไม่แสดงเลขลำดับ)';
      case 'description':
        return activeRowObj.description;
      case 'unit':
        return activeRowObj.unit;
      case 'quantity':
        return activeRowObj.quantity;
      case 'materialPrice':
        return activeRowObj.materialPrice;
      case 'materialAmount':
        return `=D${activeCell.row + 1}*E${activeCell.row + 1}  (${formatMoney(activeComp.mAmt)})`;
      case 'laborPrice':
        return activeRowObj.laborPrice;
      case 'laborAmount':
        return `=D${activeCell.row + 1}*G${activeCell.row + 1}  (${formatMoney(activeComp.lAmt)})`;
      case 'total':
        return `=F${activeCell.row + 1}+H${activeCell.row + 1}  (${formatMoney(activeComp.total)})`;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden select-none">
      {/* Excel Ribbon / Quick Action Toolbar */}
      <div className="bg-[#f3f6f4] border-b border-slate-300 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => insertRowAt(activeCell.row + 1, 'category')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#107c41] hover:bg-[#0c6132] text-white text-xs font-semibold shadow-2xs transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            + หัวข้อหลัก (1, 2, 3...)
          </button>

          <button
            type="button"
            onClick={() => insertRowAt(activeCell.row + 1, 'item')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-300 shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5 text-[#107c41]" />
            + รายการย่อย (-)
          </button>

          <div className="h-5 w-px bg-slate-300 mx-0.5" />

          <button
            type="button"
            onClick={() => toggleRowType(activeCell.row)}
            title="สลับแถวที่เลือกเป็น หัวข้อหลัก (ตัวหนา+เลขลำดับ) หรือ รายการย่อย"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-300 transition"
          >
            <ListTree className="w-3.5 h-3.5 text-blue-600" />
            สลับหัวข้อ/รายการย่อย
          </button>

          <button
            type="button"
            onClick={() => duplicateRowAt(activeCell.row)}
            title="คัดลอกแถวที่เลือก"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-300 transition"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            คัดลอกแถว
          </button>

          <button
            type="button"
            onClick={() => moveRow(activeCell.row, -1)}
            disabled={activeCell.row === 0}
            title="เลื่อนแถวขึ้น"
            className="p-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 disabled:opacity-40 transition"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => moveRow(activeCell.row, 1)}
            disabled={activeCell.row >= rows.length - 1}
            title="เลื่อนแถวลง"
            className="p-1.5 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 disabled:opacity-40 transition"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => removeRowAt(activeCell.row)}
            title="ลบแถวที่เลือก"
            className="p-1.5 rounded bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAllToClipboard}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white hover:bg-emerald-50 text-[#107c41] text-xs font-semibold border border-[#107c41]/30 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Copy ไปวางใน Excel
          </button>
        </div>
      </div>

      {/* Paste / Action Notification */}
      {pasteNotice && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-1.5 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{pasteNotice}</span>
        </div>
      )}

      {/* Excel Formula Bar (Name Box + fx Input) */}
      <div className="bg-white border-b border-slate-300 px-2 py-1.5 flex flex-wrap items-center gap-2 text-xs">
        <div className="min-w-14 px-2 py-1 bg-slate-100 border border-slate-300 rounded text-center font-mono font-bold text-slate-700 shrink-0">
          {activeCellRefLabel}
        </div>
        <div className="text-slate-400 font-serif italic font-bold px-1 select-none">fx</div>
        <input
          type="text"
          readOnly={!activeColDef.editable}
          value={getFormulaBarDisplay()}
          onChange={(e) => {
            if (!activeColDef.editable || !activeRowObj) return;
            const k = activeColDef.key as keyof ExcelBoqRow;
            updateRowField(activeCell.row, k, e.target.value);
          }}
          placeholder="เลือกช่องเพื่อแก้ไข หรือ Copy จาก Excel แล้วกด Ctrl+V / Cmd+V วางลงในตารางได้เลย"
          className={`flex-1 min-w-[200px] px-2.5 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#107c41] ${
            !activeColDef.editable ? 'bg-slate-50 text-slate-500 font-mono' : 'bg-white text-slate-900'
          }`}
        />
        {selectionStats.isMulti && selectionStats.numericCount > 0 ? (
          <div className="inline-flex items-center gap-2 bg-[#edf7f0] border border-[#107c41]/35 text-[#0c6132] px-2.5 py-1 rounded-md font-medium shrink-0">
            <Calculator className="w-3.5 h-3.5 text-[#107c41]" />
            <span>
              Count: <strong className="font-mono">{selectionStats.numericCount}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Sum:{' '}
              <strong className="font-mono text-sm font-bold text-[#107c41]">
                ฿{selectionStats.sum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
        ) : (
          <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-slate-400 pr-1">
            <ClipboardPaste className="w-3.5 h-3.5 text-[#107c41]" />
            ลากคลุมช่องเพื่อดู Sum | วางจาก Excel (Ctrl/Cmd+V) ได้ตรงๆ
          </span>
        )}
      </div>

      {/* Spreadsheet Grid */}
      <div className={`overflow-x-auto always-scrollbar ${isDragging ? 'select-none' : ''}`}>
        <table className="w-full border-collapse text-xs table-fixed min-w-[960px]">
          <colgroup>
            <col className="w-9" />
            <col className="w-12" />
            <col className="w-[340px]" />
            <col className="w-16" />
            <col className="w-20" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-28" />
          </colgroup>
          <thead>
            {/* Excel Column Letters A - I */}
            <tr className="bg-[#e9ecef] text-slate-600 text-[11px] font-semibold border-b border-slate-300">
              <th className="border-r border-slate-300 p-1 text-center bg-[#dee2e6]"></th>
              {COLUMNS.map((col, idx) => {
                const isColSelected = selectionBounds
                  ? idx >= selectionBounds.minCol && idx <= selectionBounds.maxCol
                  : activeCell.col === idx;
                return (
                  <th
                    key={col.key}
                    onClick={() => {
                      if (rows.length === 0) return;
                      setActiveCell({ row: 0, col: idx });
                      setSelectionRange({
                        startRow: 0,
                        startCol: idx,
                        endRow: rows.length - 1,
                        endCol: idx,
                      });
                    }}
                    title={`คลิกเพื่อเลือกคอลัมน์ ${col.letter} (${col.label}) ทั้งหมด`}
                    className={`border-r border-slate-300 p-1 text-center font-mono cursor-pointer transition-colors ${
                      isColSelected ? 'bg-[#d3e8da] text-[#0c6132] font-bold' : 'hover:bg-slate-200/70'
                    }`}
                  >
                    {col.letter}
                  </th>
                );
              })}
            </tr>

            {/* Company Green Quotation Table Header */}
            <tr className="bg-[#a9d08e] text-black font-bold border-b border-slate-700 text-[11.5px]">
              <th className="border-r border-slate-300 bg-[#e9ecef] text-slate-500 font-mono text-[10px]">
                #
              </th>
              <th className="border-r border-slate-700 p-1.5 text-center" rowSpan={2}>
                Items
              </th>
              <th className="border-r border-slate-700 p-1.5 text-center" rowSpan={2}>
                Description
              </th>
              <th className="border-r border-slate-700 p-1.5 text-center" rowSpan={2}>
                Unit
              </th>
              <th className="border-r border-slate-700 p-1.5 text-center" rowSpan={2}>
                Quantity
              </th>
              <th className="border-r border-b border-slate-700 p-1 text-center" colSpan={2}>
                Material Charge
              </th>
              <th className="border-r border-b border-slate-700 p-1 text-center" colSpan={2}>
                Labour Charge
              </th>
              <th
                onClick={() => {
                  if (rows.length === 0) return;
                  setActiveCell({ row: 0, col: 8 });
                  setSelectionRange({
                    startRow: 0,
                    startCol: 8,
                    endRow: rows.length - 1,
                    endCol: 8,
                  });
                }}
                title="คลิกเพื่อเลือก Total ทั้งคอลัมน์"
                className="p-1.5 text-center cursor-pointer hover:bg-[#99c47c] transition-colors"
                rowSpan={2}
              >
                Total
              </th>
            </tr>
            <tr className="bg-[#a9d08e] text-black font-bold border-b border-slate-700 text-[11px]">
              <th className="border-r border-slate-300 bg-[#e9ecef]"></th>
              <th className="border-r border-slate-700 p-1 text-center">Qty / Price</th>
              <th className="border-r border-slate-700 p-1 text-center">Amount</th>
              <th className="border-r border-slate-700 p-1 text-center">Qty / Price</th>
              <th className="border-r border-slate-700 p-1 text-center">Amount</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rIdx) => {
              const comp = computedRows[rIdx];
              const isCat = row.rowType === 'category';
              const isRowActive = selectionBounds
                ? rIdx >= selectionBounds.minRow && rIdx <= selectionBounds.maxRow
                : activeCell.row === rIdx;

              const isInRange = (cIdx: number) =>
                Boolean(
                  selectionBounds &&
                    rIdx >= selectionBounds.minRow &&
                    rIdx <= selectionBounds.maxRow &&
                    cIdx >= selectionBounds.minCol &&
                    cIdx <= selectionBounds.maxCol
                );

              const cellRing = (cIdx: number) => {
                const isAnchor = activeCell.row === rIdx && activeCell.col === cIdx;
                const inRange = isInRange(cIdx);
                if (selectionBounds?.isMulti && inRange) {
                  return isAnchor ? 'bg-[#edf7f0]' : 'bg-[#d3e8da]/45';
                }
                return isAnchor ? 'ring-2 ring-inset ring-[#107c41] bg-[#edf7f0]' : '';
              };

              const cellSelectionStyle = (cIdx: number): React.CSSProperties | undefined => {
                if (!selectionBounds?.isMulti || !isInRange(cIdx)) return undefined;
                const shadows: string[] = [];
                if (rIdx === selectionBounds.minRow) shadows.push('inset 0 2px 0 0 #107c41');
                if (rIdx === selectionBounds.maxRow) shadows.push('inset 0 -2px 0 0 #107c41');
                if (cIdx === selectionBounds.minCol) shadows.push('inset 2px 0 0 0 #107c41');
                if (cIdx === selectionBounds.maxCol) shadows.push('inset -2px 0 0 0 #107c41');
                return shadows.length > 0 ? { boxShadow: shadows.join(', ') } : undefined;
              };

              return (
                <tr
                  key={row.id}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActiveCell({ row: rIdx, col: activeCell.col });
                    setContextMenu({ x: e.clientX, y: e.clientY, rowIndex: rIdx });
                  }}
                  className={`border-b border-slate-200 ${
                    isCat ? 'bg-slate-50/70' : 'bg-white'
                  } hover:bg-blue-50/20`}
                >
                  {/* Excel Row Number Header */}
                  <td
                    onClick={() => focusCell(rIdx, 1)}
                    title="คลิกขวาเพื่อแทรก/ลบแถว"
                    className={`border-r border-slate-300 text-center font-mono text-[11px] cursor-pointer ${
                      isRowActive
                        ? 'bg-[#d3e8da] text-[#0c6132] font-bold'
                        : 'bg-[#f1f3f5] text-slate-500'
                    }`}
                  >
                    {rIdx + 1}
                  </td>

                  {/* Col A: Items (Auto Number for Categories) */}
                  <td
                    onMouseDown={(e) => handleCellMouseDown(e, rIdx, 0, true)}
                    onMouseEnter={() => handleCellMouseEnter(rIdx, 0)}
                    style={cellSelectionStyle(0)}
                    className={`border-r border-slate-200 p-1 text-center font-mono cursor-cell ${
                      isCat ? 'font-bold text-slate-900' : 'text-slate-300'
                    } ${cellRing(0)}`}
                  >
                    <input
                      ref={(el) => {
                        cellRefs.current[`${rIdx}-0`] = el;
                      }}
                      type="text"
                      readOnly
                      value={comp.itemNo}
                      onFocus={() => handleCellFocus(rIdx, 0)}
                      onKeyDown={(e) => handleKeyDown(e, rIdx, 0)}
                      onPaste={(e) => handleCellPaste(e, rIdx, 0)}
                      className="w-full text-center bg-transparent outline-none cursor-cell font-bold select-none"
                    />
                  </td>

                  {/* Col B: Description */}
                  <td
                    onMouseDown={(e) => handleCellMouseDown(e, rIdx, 1, false)}
                    onMouseEnter={() => handleCellMouseEnter(rIdx, 1)}
                    style={cellSelectionStyle(1)}
                    className={`border-r border-slate-200 p-0 align-top ${cellRing(1)}`}
                  >
                    <textarea
                      ref={(el) => {
                        cellRefs.current[`${rIdx}-1`] = el;
                      }}
                      rows={Math.max(1, (row.description || '').split('\n').length)}
                      value={row.description}
                      onFocus={() => handleCellFocus(rIdx, 1)}
                      onChange={(e) => updateRowField(rIdx, 'description', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rIdx, 1)}
                      onPaste={(e) => handleCellPaste(e, rIdx, 1)}
                      placeholder={
                        isCat ? 'พิมพ์ชื่อหัวข้อหลัก...' : '- พิมพ์รายการย่อย (Shift+Enter ขึ้นบรรทัดใหม่)'
                      }
                      className={`w-full px-2 py-1.5 bg-transparent outline-none resize-none leading-snug text-xs ${
                        isCat
                          ? 'font-bold text-slate-950'
                          : 'font-normal text-slate-800 pl-4'
                      }`}
                    />
                  </td>

                  {/* Col C: Unit */}
                  <td
                    onMouseDown={(e) => handleCellMouseDown(e, rIdx, 2, false)}
                    onMouseEnter={() => handleCellMouseEnter(rIdx, 2)}
                    style={cellSelectionStyle(2)}
                    className={`border-r border-slate-200 p-0 ${cellRing(2)}`}
                  >
                    <input
                      ref={(el) => {
                        cellRefs.current[`${rIdx}-2`] = el;
                      }}
                      type="text"
                      value={row.unit}
                      onFocus={() => handleCellFocus(rIdx, 2)}
                      onChange={(e) => updateRowField(rIdx, 'unit', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rIdx, 2)}
                      onPaste={(e) => handleCellPaste(e, rIdx, 2)}
                      placeholder={isCat ? '' : 'JOB'}
                      className="w-full h-full px-1.5 py-1.5 text-center bg-transparent outline-none text-xs"
                    />
                  </td>

                  {/* Col D: Quantity */}
                  <td
                    onMouseDown={(e) => handleCellMouseDown(e, rIdx, 3, false)}
                    onMouseEnter={() => handleCellMouseEnter(rIdx, 3)}
                    style={cellSelectionStyle(3)}
                    className={`border-r border-slate-200 p-0 ${cellRing(3)}`}
                  >
                    <input
                      ref={(el) => {
                        cellRefs.current[`${rIdx}-3`] = el;
                      }}
                      type="text"
                      inputMode="decimal"
                      value={row.quantity}
                      onFocus={() => handleCellFocus(rIdx, 3)}
                      onChange={(e) => updateRowField(rIdx, 'quantity', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, rIdx, 3)}
                      onPaste={(e) => handleCellPaste(e, rIdx, 3)}
                      className="w-full h-full px-1.5 py-1.5 text-right font-mono bg-transparent outline-none text-xs"
                    />
                  </td>

                  {/* Col E: Material Price */}
                  <td
                    onMouseDown={(e) => handleCellMouseDown(e, rIdx, 4, false)}
                    onMouseEnter={() => handleCellMouseEnter(rIdx, 4)}
                    style={cellSelectionStyle(4)}
                    className={`border-r border-slate-200 p-0 ${cellRing(4)}`}
                  >
                    <input
                      ref={(el) => {
                        cellRefs.current[`${rIdx}-4`] = el;
                      }}
                      type="text"
                      inputMode="decimal"
                      value={
                        focusedNumericCell === `${rIdx}-4`
                          ? row.materialPrice
                          : comp.mp > 0
                          ? formatMoney(comp.mp)
                          : ''
                      }
                      onFocus={() => {
                        handleCellFocus(rIdx, 4);
                        setFocusedNumericCell(`${rIdx}-4`);
                      }}
                      onBlur={() => setFocusedNumericCell(null)}
                      onChange={(e) =>
                        updateRowField(rIdx, 'materialPrice', e.target.value.replace(/,/g, ''))
                      }
                      onKeyDown={(e) => handleKeyDown(e, rIdx, 4)}
                      onPaste={(e) => handleCellPaste(e, rIdx, 4)}
                      placeholder={isCat ? '' : '-'}
                      className="w-full h-full px-1.5 py-1.5 text-right font-mono bg-transparent outline-none text-xs"
                    />
                  </td>

                  {/* Col F: Material Amount (Formula) */}
                  <td
                    onMouseDown={(e) => handleCellMouseDown(e, rIdx, 5, true)}
                    onMouseEnter={() => handleCellMouseEnter(rIdx, 5)}
                    style={cellSelectionStyle(5)}
                    className={`border-r border-slate-200 p-0 bg-emerald-50/25 cursor-cell ${cellRing(
                      5
                    )}`}
                  >
                    <input
                      ref={(el) => {
                        cellRefs.current[`${rIdx}-5`] = el;
                      }}
                      type="text"
                      readOnly
                      value={comp.mAmt > 0 ? formatMoney(comp.mAmt) : isCat && !row.quantity ? '' : '-'}
                      onFocus={() => handleCellFocus(rIdx, 5)}
                      onKeyDown={(e) => handleKeyDown(e, rIdx, 5)}
                      className="w-full h-full px-1.5 py-1.5 text-right font-mono text-slate-700 bg-transparent outline-none cursor-cell text-xs select-none"
                    />
                  </td>

                  {/* Col G: Labour Price */}
                  <td
                    onMouseDown={(e) => handleCellMouseDown(e, rIdx, 6, false)}
                    onMouseEnter={() => handleCellMouseEnter(rIdx, 6)}
                    style={cellSelectionStyle(6)}
                    className={`border-r border-slate-200 p-0 ${cellRing(6)}`}
                  >
                    <input
                      ref={(el) => {
                        cellRefs.current[`${rIdx}-6`] = el;
                      }}
                      type="text"
                      inputMode="decimal"
                      value={
                        focusedNumericCell === `${rIdx}-6`
                          ? row.laborPrice
                          : comp.lp > 0
                          ? formatMoney(comp.lp)
                          : ''
                      }
                      onFocus={() => {
                        handleCellFocus(rIdx, 6);
                        setFocusedNumericCell(`${rIdx}-6`);
                      }}
                      onBlur={() => setFocusedNumericCell(null)}
                      onChange={(e) =>
                        updateRowField(rIdx, 'laborPrice', e.target.value.replace(/,/g, ''))
                      }
                      onKeyDown={(e) => handleKeyDown(e, rIdx, 6)}
                      onPaste={(e) => handleCellPaste(e, rIdx, 6)}
                      placeholder={isCat ? '' : '-'}
                      className="w-full h-full px-1.5 py-1.5 text-right font-mono bg-transparent outline-none text-xs"
                    />
                  </td>

                  {/* Col H: Labour Amount (Formula) */}
                  <td
                    onMouseDown={(e) => handleCellMouseDown(e, rIdx, 7, true)}
                    onMouseEnter={() => handleCellMouseEnter(rIdx, 7)}
                    style={cellSelectionStyle(7)}
                    className={`border-r border-slate-200 p-0 bg-emerald-50/25 cursor-cell ${cellRing(
                      7
                    )}`}
                  >
                    <input
                      ref={(el) => {
                        cellRefs.current[`${rIdx}-7`] = el;
                      }}
                      type="text"
                      readOnly
                      value={comp.lAmt > 0 ? formatMoney(comp.lAmt) : isCat && !row.quantity ? '' : '-'}
                      onFocus={() => handleCellFocus(rIdx, 7)}
                      onKeyDown={(e) => handleKeyDown(e, rIdx, 7)}
                      className="w-full h-full px-1.5 py-1.5 text-right font-mono text-slate-700 bg-transparent outline-none cursor-cell text-xs select-none"
                    />
                  </td>

                  {/* Col I: Row Total (Formula) */}
                  <td
                    onMouseDown={(e) => handleCellMouseDown(e, rIdx, 8, true)}
                    onMouseEnter={() => handleCellMouseEnter(rIdx, 8)}
                    style={cellSelectionStyle(8)}
                    className={`p-0 bg-slate-50/60 cursor-cell ${cellRing(8)}`}
                  >
                    <input
                      ref={(el) => {
                        cellRefs.current[`${rIdx}-8`] = el;
                      }}
                      type="text"
                      readOnly
                      value={comp.total > 0 ? formatMoney(comp.total) : isCat && !row.quantity ? '' : '-'}
                      onFocus={() => handleCellFocus(rIdx, 8)}
                      onKeyDown={(e) => handleKeyDown(e, rIdx, 8)}
                      className="w-full h-full px-2 py-1.5 text-right font-mono font-bold text-slate-900 bg-transparent outline-none cursor-cell text-xs select-none"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Excel-style Status Bar (appears when multi-selecting cells) */}
      {selectionStats.isMulti && (
        <div className="bg-[#e8f5ec] border-t border-[#107c41]/30 px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#0c6132]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Calculator className="w-3.5 h-3.5 text-[#107c41]" />
              ช่วงที่เลือก: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#107c41]/25">{selectionStats.rangeLabel}</span>
            </span>
            {selectionStats.numericCount > 0 ? (
              <>
                <span className="text-slate-600">
                  Average:{' '}
                  <strong className="font-mono text-slate-900">
                    ฿{selectionStats.avg.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </span>
                <span className="text-slate-600">
                  Count: <strong className="font-mono text-slate-900">{selectionStats.numericCount}</strong>
                </span>
                <span className="bg-[#107c41] text-white px-2.5 py-0.5 rounded font-semibold shadow-2xs">
                  Sum:{' '}
                  <span className="font-mono font-bold">
                    ฿{selectionStats.sum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </span>
              </>
            ) : (
              <span className="text-slate-500">เลือก {selectionStats.cellCount} ช่อง (ไม่มีค่าตัวเลข)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectionStats.numericCount > 0 && (
              <button
                type="button"
                onClick={handleCopySum}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-emerald-50 text-[#0c6132] border border-[#107c41]/30 text-[11px] font-semibold transition"
              >
                {copiedSum ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copiedSum ? 'คัดลอกยอดแล้ว' : 'คัดลอกยอด Sum'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectionRange(null)}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline"
            >
              ล้างการเลือก
            </button>
          </div>
        </div>
      )}

      {/* Floating Excel Quick-Sum Badge (always visible even when table is long) */}
      {selectionStats.isMulti && selectionStats.numericCount > 0 && (
        <div className="fixed bottom-5 right-6 z-40 flex items-center gap-3 bg-white border-2 border-[#107c41] shadow-xl rounded-xl px-4 py-2.5 text-xs">
          <div className="w-8 h-8 rounded-lg bg-[#107c41] text-white flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span className="font-mono font-bold text-[#0c6132]">{selectionStats.rangeLabel}</span>
              <span>•</span>
              <span>Count: <strong className="text-slate-800">{selectionStats.numericCount}</strong></span>
              <span>•</span>
              <span>Avg: <strong className="font-mono text-slate-800">฿{selectionStats.avg.toLocaleString('th-TH', { maximumFractionDigits: 2 })}</strong></span>
            </div>
            <div className="text-sm font-bold text-slate-900">
              Sum:{' '}
              <span className="font-mono text-base text-[#107c41]">
                ฿{selectionStats.sum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopySum}
            title="คัดลอกยอดรวม Sum"
            className="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#edf7f0] hover:bg-[#d3e8da] text-[#0c6132] font-semibold transition"
          >
            {copiedSum ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSum ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      {/* Bottom Quick Add Row Hint */}
      <div className="bg-[#f8fafc] border-t border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            💡 <strong>คีย์ลัดแบบ Excel:</strong> ลูกศร ⬆️⬇️⬅️➡️ ย้ายช่อง | <strong>Tab</strong> ไปช่องกรอกถัดไป |{' '}
            <strong>Enter</strong> ลงแถวใหม่ | <strong>ลากเมาส์คลุม</strong> เพื่อรวมยอด Sum
          </span>
          <span>
            • <strong>คลิกขวา</strong> ที่แถวเพื่อ แทรก/สลับหัวข้อ/ลบแถว
          </span>
        </div>
        <button
          type="button"
          onClick={() => insertRowAt(rows.length, 'item')}
          className="text-[#107c41] hover:underline font-semibold"
        >
          + เพิ่มแถวต่อท้าย
        </button>
      </div>

      {/* Right-click Context Menu (Excel Style) */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1 text-xs text-slate-700"
        >
          <button
            type="button"
            onClick={() => insertRowAt(contextMenu.rowIndex, 'category')}
            className="w-full px-3 py-1.5 text-left hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#107c41]" />
            แทรกหัวข้อหลักด้านบน
          </button>
          <button
            type="button"
            onClick={() => insertRowAt(contextMenu.rowIndex + 1, 'item')}
            className="w-full px-3 py-1.5 text-left hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            แทรกรายการย่อยด้านล่าง
          </button>
          <button
            type="button"
            onClick={() => toggleRowType(contextMenu.rowIndex)}
            className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
          >
            <ListTree className="w-3.5 h-3.5 text-indigo-600" />
            สลับ หัวข้อหลัก ↔ รายการย่อย
          </button>
          <button
            type="button"
            onClick={() => duplicateRowAt(contextMenu.rowIndex)}
            className="w-full px-3 py-1.5 text-left hover:bg-slate-100 flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            ทำสำเนาแถวนี้
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            onClick={() => removeRowAt(contextMenu.rowIndex)}
            className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            ลบแถวนี้
          </button>
        </div>
      )}
    </div>
  );
}
