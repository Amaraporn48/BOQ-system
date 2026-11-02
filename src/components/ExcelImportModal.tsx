'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Clipboard,
  Check,
  AlertCircle,
  X,
  ArrowRight,
  Plus,
  HelpCircle,
} from 'lucide-react';

export interface ImportedBoqItem {
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

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { name: string }[];
  onImport: (items: ImportedBoqItem[], targetCategoryIndex: number, newCategoryName?: string) => void;
}

export function ExcelImportModal({
  isOpen,
  onClose,
  categories,
  onImport,
}: ExcelImportModalProps) {
  const [rawText, setRawText] = useState('');
  const [targetCategory, setTargetCategory] = useState<string>('0');
  const [newCatName, setNewCatName] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);

  if (!isOpen) return null;

  const parseData = (text: string) => {
    if (!text.trim()) {
      setParsedRows([]);
      setPreviewError(null);
      return;
    }

    try {
      const lines = text
        .trim()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        setParsedRows([]);
        return;
      }

      // Check separator: Tab (\t) is default from Excel copy, otherwise comma (CSV) or semicolon
      const firstLine = lines[0];
      const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

      const rows = lines.map((l) =>
        l.split(sep).map((c) => c.replace(/^["']|["']$/g, '').trim())
      );

      // Check if row 0 looks like a header
      const headerCandidates = ['ลำดับ', 'รายการ', 'รายละเอียด', 'description', 'จำนวน', 'qty', 'ราคา', 'หน่วย', 'unit', 'price'];
      const isHeader = rows[0].some((col) =>
        headerCandidates.some((hc) => col.toLowerCase().includes(hc))
      );

      const dataRows = isHeader ? rows.slice(1) : rows;

      const items: ImportedBoqItem[] = dataRows.map((cols, idx) => {
        // Typical Thai BOQ layout:
        // Col 0: No (1, 2, 3...)
        // Col 1: Description (รายการ)
        // Col 2: Specification / Model (สเปก)
        // Col 3: Quantity (จำนวน)
        // Col 4: Unit (หน่วย)
        // Col 5: Material Price (ค่าวัสดุ)
        // Col 6: Labor Price (ค่าแรง)
        // or
        // Col 0: Description, Col 1: Quantity, Col 2: Unit, Col 3: Price

        let desc = '';
        let spec = '';
        let qty = 1;
        let unit = 'JOB';
        let matPrice = 0;
        let labPrice = 0;
        let unitPrice = 0;

        // Clean number helper
        const cleanNum = (str: string) => {
          if (!str) return 0;
          const cleaned = str.replace(/[^0-9.-]+/g, '');
          const n = parseFloat(cleaned);
          return isNaN(n) ? 0 : n;
        };

        if (cols.length >= 7) {
          // Full format: No, Desc, Spec, Qty, Unit, Mat, Lab
          desc = cols[1] || cols[0];
          spec = cols[2] || '';
          qty = cleanNum(cols[3]) || 1;
          unit = cols[4] || 'JOB';
          matPrice = cleanNum(cols[5]);
          labPrice = cleanNum(cols[6]);
          unitPrice = matPrice + labPrice;
        } else if (cols.length >= 5) {
          // No, Desc, Qty, Unit, Price
          desc = cols[1] || cols[0];
          qty = cleanNum(cols[2]) || 1;
          unit = cols[3] || 'JOB';
          unitPrice = cleanNum(cols[4]);
          matPrice = unitPrice;
        } else if (cols.length >= 3) {
          // Desc, Qty, Price
          desc = cols[0];
          qty = cleanNum(cols[1]) || 1;
          unitPrice = cleanNum(cols[2]);
          matPrice = unitPrice;
        } else if (cols.length === 2) {
          // Desc, Total Amount
          desc = cols[0];
          qty = 1;
          unitPrice = cleanNum(cols[1]);
          matPrice = unitPrice;
        } else {
          desc = cols[0];
        }

        const matAmount = Math.round(qty * matPrice * 100) / 100;
        const labAmount = Math.round(qty * labPrice * 100) / 100;
        const totalAmount =
          matAmount + labAmount > 0
            ? Math.round((matAmount + labAmount) * 100) / 100
            : Math.round(qty * unitPrice * 100) / 100;

        return {
          itemNo: idx + 1,
          description: desc,
          specification: spec,
          unit: unit || 'JOB',
          quantity: qty,
          materialPrice: matPrice,
          materialAmount: matAmount,
          laborPrice: labPrice,
          laborAmount: labAmount,
          unitPrice: unitPrice > 0 ? unitPrice : matPrice + labPrice,
          amount: totalAmount,
          notes: '',
        };
      });

      setParsedRows(items.filter((it) => it.description.trim().length > 0));
      setPreviewError(null);
    } catch (err: any) {
      setPreviewError('ไม่สามารถแปลงข้อมูลได้ กรุณาตรวจสอบรูปแบบข้อความ');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawText(text);
        parseData(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApply = () => {
    if (parsedRows.length === 0) {
      alert('ไม่พบรายการที่สามารถนำเข้าได้');
      return;
    }

    if (targetCategory === '__new__') {
      if (!newCatName.trim()) {
        alert('กรุณากรอกชื่อหมวดงานใหม่');
        return;
      }
      onImport(parsedRows, -1, newCatName.trim());
    } else {
      const catIdx = parseInt(targetCategory, 10);
      onImport(parsedRows, catIdx);
    }
    onClose();
  };

  const pasteSample = () => {
    const sample = `ลำดับ\tรายการงาน\tรายละเอียด/สเปค\tจำนวน\tหน่วย\tราคาวัสดุ\tค่าแรง\tราคารวม
1\tงานจัดหาและติดตั้งเครื่องปรับอากาศ VRV\tDaikin ขนาด 38,000 BTU\t2\tเครื่อง\t45000\t5000\t100000
2\tงานเดินท่อน้ำยาและฉนวนหุ้มท่อ\tท่อทองแดงหนา 0.81 มม.\t30\tเมตร\t650\t250\t27000
3\tงานติดตั้งชุดควบคุมอุณหภูมิดิจิทัล\tระบบตรวจจับแจ้งเตือนแม่นยำสูง\t1\tชุด\t12500\t1500\t14000
4\tงานทดสอบและส่งมอบงานระบบ\tตรวจเช็คลมรั่วและแรงดันน้ำยา\t1\tงาน\t0\t5000\t5000`;
    setRawText(sample);
    parseData(sample);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                นำเข้าข้อมูลจาก Excel / สเปรดชีต (Import to BOQ)
              </h3>
              <p className="text-[11px] text-slate-500">
                ก๊อปปี้แถวจาก Excel มาวาง หรือเลือกไฟล์ CSV/TSV เพื่อแตกเข้าตาราง BOQ อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Target Category Selection */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-700 whitespace-nowrap">
              นำเข้ารายการไปยังหมวดงาน:
            </span>
            <select
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              {categories.map((c, idx) => (
                <option key={idx} value={String(idx)}>
                  หมวด {idx + 1}: {c.name || 'ไม่มีชื่อหมวด'}
                </option>
              ))}
              <option value="__new__" className="text-emerald-700 font-bold bg-emerald-50">
                + สร้างหมวดงานใหม่สำหรับรายการเหล่านี้...
              </option>
            </select>

            {targetCategory === '__new__' && (
              <input
                type="text"
                placeholder="พิมพ์ชื่อหมวดงานใหม่..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 min-w-[200px] border border-emerald-300 rounded-lg px-3 py-1.5 bg-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                autoFocus
              />
            )}
          </div>

          {/* Paste area & File upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clipboard className="w-4 h-4 text-emerald-600" />
                วางข้อความที่ก๊อปปี้จาก Excel (Ctrl+V / Cmd+V ในช่องนี้):
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={pasteSample}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold underline"
                >
                  ลองใส่ข้อมูลตัวอย่าง
                </button>
                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer border border-slate-300 text-[11px] transition">
                  <Upload className="w-3.5 h-3.5" />
                  หรือเลือกไฟล์ .CSV
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                parseData(e.target.value);
              }}
              placeholder="ก๊อปปี้แถวจาก Excel มาวางที่นี่ได้ทันที (รองรับคอลัมน์: รายการ, สเปค, จำนวน, หน่วย, ค่าวัสดุ, ค่าแรง)..."
              className="w-full border border-slate-300 rounded-xl p-3 font-mono text-[11px] bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition leading-relaxed"
            />
          </div>

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-emerald-50/80 px-4 py-2 border-b border-emerald-100 flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  ตรวจพบและพร้อมนำเข้า: {parsedRows.length} รายการ
                </span>
                <span className="text-[11px] text-emerald-800 font-medium">
                  มูลค่ารวมรายการที่นำเข้า: ฿
                  {parsedRows
                    .reduce((sum, it) => sum + it.amount, 0)
                    .toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2">รายการ</th>
                      <th className="p-2">สเปค</th>
                      <th className="p-2 text-right">จำนวน</th>
                      <th className="p-2 text-center">หน่วย</th>
                      <th className="p-2 text-right">ค่าวัสดุ</th>
                      <th className="p-2 text-right">ค่าแรง</th>
                      <th className="p-2 text-right">รวมเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {parsedRows.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-400">{it.itemNo}</td>
                        <td className="p-2 font-medium text-slate-800">{it.description}</td>
                        <td className="p-2 text-slate-500">{it.specification || '-'}</td>
                        <td className="p-2 text-right font-mono">{it.quantity}</td>
                        <td className="p-2 text-center text-slate-600">{it.unit}</td>
                        <td className="p-2 text-right font-mono">
                          {it.materialPrice ? it.materialPrice.toLocaleString() : '-'}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {it.laborPrice ? it.laborPrice.toLocaleString() : '-'}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {it.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {previewError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{previewError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl">
          <div className="text-[11px] text-slate-400">
            * ระบบคำนวณยอดเงินรวมและภาษีให้อัตโนมัติหลังนำเข้า
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={parsedRows.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition"
            >
              <Check className="w-4 h-4" />
              นำเข้า {parsedRows.length} รายการเข้าสู่ BOQ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
