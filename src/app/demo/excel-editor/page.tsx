'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import {
  ExcelBoqGrid,
  ExcelBoqRow,
  createEmptyExcelRow,
} from '@/components/ExcelBoqGrid';
import { calculateDocumentTotals } from '@/lib/calculations';
import {
  FileSpreadsheet,
  Eye,
  RotateCcw,
  ArrowLeft,
  Keyboard,
  ClipboardPaste,
  MousePointerClick,
} from 'lucide-react';

const SAMPLE_ROWS: ExcelBoqRow[] = [
  {
    id: 'demo_1',
    rowType: 'category',
    description: 'งานปรับปรุงผนัง ห้อง ผ.อ. แพทย์ ชั้น 12 อาคาร 1',
    unit: '',
    quantity: '',
    materialPrice: '',
    laborPrice: '',
  },
  {
    id: 'demo_2',
    rowType: 'item',
    description: '- งานก่อผนังเบา',
    unit: 'ตร.ม',
    quantity: '31',
    materialPrice: '750',
    laborPrice: '650',
  },
  {
    id: 'demo_3',
    rowType: 'item',
    description: '- งานติดตั้งฉนวนกันเสียง',
    unit: 'ตร.ม',
    quantity: '31',
    materialPrice: '2487',
    laborPrice: '800',
  },
  {
    id: 'demo_4',
    rowType: 'item',
    description: '- งานทาสี',
    unit: 'ตร.ม',
    quantity: '31',
    materialPrice: '160',
    laborPrice: '140',
  },
  {
    id: 'demo_5',
    rowType: 'category',
    description: 'งานติดตั้งฉนวนกันเสียงบนฝ้า',
    unit: '',
    quantity: '',
    materialPrice: '',
    laborPrice: '',
  },
  {
    id: 'demo_6',
    rowType: 'item',
    description: '- งานเจาะรื้อฝ้าเพื่อติดตั้งฉนวนกันเสียง',
    unit: 'JOB',
    quantity: '1',
    materialPrice: '',
    laborPrice: '1500',
  },
  {
    id: 'demo_7',
    rowType: 'item',
    description: '- งานติดตั้งฉนวนกันเสียง',
    unit: 'ตร.ม',
    quantity: '25',
    materialPrice: '2487',
    laborPrice: '800',
  },
  {
    id: 'demo_8',
    rowType: 'item',
    description: '- งานซ่อมฝ้าและทาสีคืนสภาพ',
    unit: 'ตร.ม',
    quantity: '25',
    materialPrice: '550',
    laborPrice: '500',
  },
  {
    id: 'demo_9',
    rowType: 'category',
    description: 'งานอื่นๆ (ใช้ของเดิมทั้งหมด)',
    unit: '',
    quantity: '',
    materialPrice: '',
    laborPrice: '',
  },
  {
    id: 'demo_10',
    rowType: 'item',
    description: '- ย้ายสายเคเบิ้ลเนื่องจากมีการก่อผนังเพิ่ม',
    unit: 'JOB',
    quantity: '1',
    materialPrice: '1000',
    laborPrice: '1500',
  },
  {
    id: 'demo_11',
    rowType: 'category',
    description: 'งาน Protection and Cleaning',
    unit: '',
    quantity: '',
    materialPrice: '',
    laborPrice: '',
  },
  {
    id: 'demo_12',
    rowType: 'item',
    description: '- อุปกรณ์ทำความสะอาด\n- งานทำความสะอาด',
    unit: 'JOB',
    quantity: '1',
    materialPrice: '4500',
    laborPrice: '1500',
  },
];

function parseNum(v: string): number {
  const n = Number(String(v || '').replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
}

export default function ExcelEditorDemoPage() {
  const [rows, setRows] = useState<ExcelBoqRow[]>(SAMPLE_ROWS);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [overheadRate, setOverheadRate] = useState(10);
  const [vatRate, setVatRate] = useState(7);

  const totals = useMemo(() => {
    const flatItems = rows.map((r) => {
      const q = parseNum(r.quantity);
      const m = parseNum(r.materialPrice);
      const l = parseNum(r.laborPrice);
      return {
        quantity: q,
        materialPrice: m,
        laborPrice: l,
        unitPrice: m + l,
      };
    });
    return calculateDocumentTotals({
      items: flatItems,
      vatRate,
      isVatIncluded: false,
      discountType: 'PERCENT',
      discountValue: 0,
      overheadRate,
    });
  }, [rows, overheadRate, vatRate]);

  return (
    <div className="flex-1 flex flex-col pb-16">
      <Header
        title="Demo: ตารางเขียน BOQ แบบ Excel (Spreadsheet Mode)"
        subtitle="ทดลองพิมพ์ เลื่อนช่อง ก๊อปปี้จาก Excel มาวางตรงๆ และดูตัวอย่างก่อนออก PDF"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/documents/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              กลับหน้าสร้างเอกสาร
            </Link>
            <button
              type="button"
              onClick={() => setRows(SAMPLE_ROWS)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              รีเซ็ตข้อมูลตัวอย่าง
            </button>
            <button
              type="button"
              onClick={() => setRows([createEmptyExcelRow('category'), createEmptyExcelRow('item')])}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition"
            >
              ล้างตารางว่าง
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-5 max-w-7xl w-full mx-auto">
        {/* Quick Guide Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5">
            <Keyboard className="w-4 h-4 text-[#107c41] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-950">พิมพ์และเลื่อนช่องเหมือน Excel</p>
              <p className="text-emerald-800/80 mt-0.5 leading-relaxed">
                ใช้ปุ่มลูกศร ⬆️⬇️⬅️➡️ ย้ายช่อง, กด <strong>Tab</strong> ข้ามช่องคำนวณอัตโนมัติ, กด{' '}
                <strong>Enter</strong> ลงแถวใหม่ (แถวสุดท้ายเพิ่มแถวให้อัตโนมัติ)
              </p>
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5">
            <ClipboardPaste className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-950">ก๊อปปี้จาก Excel มาวางตรงๆ ได้เลย</p>
              <p className="text-blue-800/80 mt-0.5 leading-relaxed">
                เปิดไฟล์ Excel ของพี่ๆ ลากคลุมหลายแถว-หลายคอลัมน์ กด Copy แล้วคลิกช่องไหนก็ได้ในตาราง กด{' '}
                <strong>Cmd+V / Ctrl+V</strong>
              </p>
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5">
            <MousePointerClick className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">คลิกขวาจัดการแถวได้ทันที</p>
              <p className="text-amber-800/80 mt-0.5 leading-relaxed">
                คลิกขวาที่แถวใดก็ได้เพื่อ <strong>แทรกหัวข้อหลัก (1, 2, 3...)</strong>, แทรกรายการย่อย{' '}
                <code>-</code>, สลับตัวหนา, ทำสำเนา หรือลบแถว
              </p>
            </div>
          </div>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition ${
                viewMode === 'edit'
                  ? 'border-[#107c41] text-[#107c41]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              โหมดเขียนแบบ Excel (Spreadsheet)
            </button>

            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition ${
                viewMode === 'preview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Eye className="w-4 h-4" />
              ดูตัวอย่างหน้าตา PDF
            </button>
          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            จำนวน {rows.length} แถว | ยอดสุทธิ:{' '}
            <span className="font-mono font-bold text-slate-900">
              ฿{totals.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'edit' ? (
          <div className="space-y-4">
            <ExcelBoqGrid rows={rows} onChange={setRows} />

            {/* Live Excel-style Summary Footer */}
            <div className="bg-white rounded-xl border border-slate-300 p-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-800">ตั้งค่าการคำนวณสรุป (Demo)</p>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-1.5">
                    <span className="text-slate-600">ค่าดำเนินการและกำไร (%):</span>
                    <input
                      type="number"
                      value={overheadRate}
                      onChange={(e) => setOverheadRate(Number(e.target.value) || 0)}
                      className="w-16 border border-slate-300 rounded px-2 py-1 text-right font-mono"
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="text-slate-600">VAT (%):</span>
                    <select
                      value={vatRate}
                      onChange={(e) => setVatRate(Number(e.target.value))}
                      className="border border-slate-300 rounded px-2 py-1 bg-white"
                    >
                      <option value={7}>7%</option>
                      <option value={0}>0% (ไม่คิด VAT)</option>
                    </select>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  * ถ้าชอบรูปแบบตารางนี้ สามารถกดสลับดูแท็บ <strong>&ldquo;ดูตัวอย่างหน้าตา PDF&rdquo;</strong>{' '}
                  ด้านบนเพื่อเช็กผลลัพธ์ก่อนพิมพ์ได้เลยครับ
                </p>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">รวมค่าวัสดุ (Material Total):</span>
                  <span className="font-mono font-semibold">
                    ฿{totals.materialTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">รวมค่าแรงงาน (Labour Total):</span>
                  <span className="font-mono font-semibold">
                    ฿{totals.laborTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-700 font-semibold">ค่าใช้จ่ายทั้งหมด (Subtotal):</span>
                  <span className="font-mono font-bold">
                    ฿{totals.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ค่าดำเนินการและกำไร ({overheadRate}%):</span>
                  <span className="font-mono font-semibold">
                    ฿{totals.overheadAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ภาษีมูลค่าเพิ่ม VAT {vatRate}%:</span>
                  <span className="font-mono font-semibold">
                    ฿{totals.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-slate-300 text-sm">
                  <span className="font-bold text-slate-900">รวมเป็นเงินทั้งสิ้น (Grand Total):</span>
                  <span className="font-mono font-extrabold text-[#107c41]">
                    ฿{totals.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-center p-1.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-900 font-medium">
                  ({totals.thaiBahtText})
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* PDF Print Preview Tab */
          <div className="bg-slate-200 p-6 rounded-xl flex justify-center overflow-x-auto">
            <div className="bg-white w-[210mm] min-h-[200mm] p-8 shadow-lg text-black text-[11px] font-sans">
              <div className="text-center font-bold text-sm mb-3">
                ตัวอย่างตารางเมื่อส่งออกเป็นเอกสารใบเสนอราคา (PDF)
              </div>
              <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                  <tr className="bg-[#a9d08e] font-bold text-black">
                    <th className="border border-black p-1.5 w-10 text-center" rowSpan={2}>
                      Items
                    </th>
                    <th className="border border-black p-1.5 text-center" rowSpan={2}>
                      Description
                    </th>
                    <th className="border border-black p-1.5 w-14 text-center" rowSpan={2}>
                      Unit
                    </th>
                    <th className="border border-black p-1.5 w-16 text-center" rowSpan={2}>
                      Quantity
                    </th>
                    <th className="border border-black p-1 text-center" colSpan={2}>
                      Material Charge
                    </th>
                    <th className="border border-black p-1 text-center" colSpan={2}>
                      Labour Charge
                    </th>
                    <th className="border border-black p-1.5 w-20 text-center" rowSpan={2}>
                      Total
                    </th>
                  </tr>
                  <tr className="bg-[#a9d08e] font-bold text-black">
                    <th className="border border-black p-1 w-16 text-center">Qty / Price</th>
                    <th className="border border-black p-1 w-16 text-center">Amount</th>
                    <th className="border border-black p-1 w-16 text-center">Qty / Price</th>
                    <th className="border border-black p-1 w-16 text-center">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let catNo = 0;
                    return rows.map((r) => {
                      const no = r.rowType === 'category' ? ++catNo : '';
                      const q = parseNum(r.quantity);
                      const mp = parseNum(r.materialPrice);
                      const lp = parseNum(r.laborPrice);
                      const ma = q * mp;
                      const la = q * lp;
                      const tot = ma + la;

                      return (
                        <tr key={r.id} className="align-top">
                          <td className="border-x border-black p-1 text-center font-bold">{no}</td>
                          <td
                            className={`border-r border-black p-1 whitespace-pre-line ${
                              r.rowType === 'category' ? 'font-bold' : 'pl-3'
                            }`}
                          >
                            {r.description}
                          </td>
                          <td className="border-r border-black p-1 text-center">{r.unit}</td>
                          <td className="border-r border-black p-1 text-center font-mono">
                            {r.quantity || ''}
                          </td>
                          <td className="border-r border-black p-1 text-right font-mono">
                            {mp > 0 ? mp.toLocaleString('th-TH') : r.quantity ? '-' : ''}
                          </td>
                          <td className="border-r border-black p-1 text-right font-mono">
                            {ma > 0 ? ma.toLocaleString('th-TH') : r.quantity ? '-' : ''}
                          </td>
                          <td className="border-r border-black p-1 text-right font-mono">
                            {lp > 0 ? lp.toLocaleString('th-TH') : r.quantity ? '-' : ''}
                          </td>
                          <td className="border-r border-black p-1 text-right font-mono">
                            {la > 0 ? la.toLocaleString('th-TH') : r.quantity ? '-' : ''}
                          </td>
                          <td className="border-r border-black p-1 text-right font-mono font-bold">
                            {tot > 0 ? tot.toLocaleString('th-TH') : r.quantity ? '-' : ''}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  <tr className="bg-[#b4c6e7] font-bold border-t border-black">
                    <td colSpan={4} className="border border-black p-1.5 text-center">
                      สรุปหมวดค่าแรงงานและอุปกรณ์
                    </td>
                    <td className="border border-black p-1.5 text-right font-mono">-</td>
                    <td className="border border-black p-1.5 text-right font-mono">
                      {totals.materialTotal.toLocaleString('th-TH')}
                    </td>
                    <td className="border border-black p-1.5 text-right font-mono">-</td>
                    <td className="border border-black p-1.5 text-right font-mono">
                      {totals.laborTotal.toLocaleString('th-TH')}
                    </td>
                    <td className="border border-black p-1.5 text-right font-mono">
                      {totals.subtotal.toLocaleString('th-TH')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
