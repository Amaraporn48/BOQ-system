'use client';

import React from 'react';
import { parseSitePhotos } from '@/lib/photoUtils';

// Helper to strip duplicate leading numbering like "1. ", "1) ", "1- " so the Items column alone holds the number
const formatDescriptionTitle = (text: string) => {
  if (!text) return '';
  return text.replace(/^\s*\d+[\.\)\-\:\s]+\s*/, '').trim() || text.trim();
};

interface QuotationPaperProps {
  document: any;
  activeRev: any;
  company?: any;
}

export default function QuotationPaper({
  document,
  activeRev,
  company: customCompany,
}: QuotationPaperProps) {
  if (!document || !activeRev) return null;

  const company = customCompany || {
    companyNameTh: 'บริษัท เทคนิคอล วอเตอร์ จำกัด',
    companyNameEn: 'TECHNICAL WATER CO.,LTD',
    address: 'เลขที่ 301/856 ซอยรามคำแหง 68 ถนนรามคำแหง แขวงหัวหมาก เขตบางกะปิ กรุงเทพ 10240',
    phone: '02-735-3022, 088-287-8259',
    email: 'Technicalwater2015@gmail.com',
  };

  // Calculate material sum, labour sum, and totals
  let totalMaterial = 0;
  let totalLabour = 0;
  let totalCombined = 0;

  (activeRev?.categories || []).forEach((cat: any) => {
    (cat.items || []).forEach((it: any) => {
      const q = Number(it.quantity) || 0;
      const mPrice = Number(it.materialPrice) || 0;
      const lPrice = Number(it.laborPrice) || 0;
      const mAmt =
        it.materialAmount !== undefined && it.materialAmount !== null
          ? Number(it.materialAmount)
          : q * mPrice;
      const lAmt =
        it.laborAmount !== undefined && it.laborAmount !== null
          ? Number(it.laborAmount)
          : q * lPrice;

      totalMaterial += mAmt;
      totalLabour += lAmt;
      totalCombined += mAmt + lAmt > 0 ? mAmt + lAmt : Number(it.amount) || 0;
    });
  });

  const subtotal = totalCombined > 0 ? totalCombined : activeRev?.subtotal || 0;
  const overheadRate = activeRev?.overheadRate !== undefined ? Number(activeRev.overheadRate) : 10.0;
  const overheadAmount =
    activeRev?.overheadAmount !== undefined && activeRev?.overheadAmount > 0
      ? Number(activeRev.overheadAmount)
      : Math.round(((subtotal * overheadRate) / 100) * 100) / 100;
  const totalBeforeVat = activeRev?.totalBeforeVat || subtotal + overheadAmount;
  const vatRate = Number(activeRev?.vatRate) || 7.0;
  const vatAmount = activeRev?.vatAmount || Math.round(((totalBeforeVat * vatRate) / 100) * 100) / 100;
  const grandTotal = activeRev?.grandTotal || totalBeforeVat + vatAmount;

  const formattedDocDate = activeRev?.documentDate
    ? new Date(activeRev.documentDate).toLocaleDateString('th-TH')
    : new Date().toLocaleDateString('th-TH');

  const photos = parseSitePhotos(activeRev?.sitePhotos);
  const photoPages: string[][] = [];
  for (let i = 0; i < photos.length; i += 2) {
    photoPages.push(photos.slice(i, i + 2));
  }
  const totalPages = photos.length > 0 ? 1 + photoPages.length : 1;

  let effectiveItemLines = 0;
  (activeRev?.categories || []).forEach((cat: any) => {
    const items = cat.items || [];
    if (items.length > 0) {
      items.forEach((it: any) => {
        effectiveItemLines += 1;
        if (it.specification) {
          const specLines = it.specification.split('\n').filter(Boolean).length;
          effectiveItemLines += specLines * 0.6;
        }
      });
    } else {
      effectiveItemLines += 1;
    }
  });

  const paymentLines = (activeRev?.paymentTerms || '').split('\n').filter(Boolean).length;
  const extraPaymentLines = Math.max(0, paymentLines - 2);
  const spacerHeight = Math.max(6, Math.round(55 - effectiveItemLines * 6 - extraPaymentLines * 4));

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Page 1: Main Quotation Sheet */}
      <div className="print-sheet w-full max-w-[210mm] mx-auto bg-white p-[8mm] sm:p-[10mm] shadow-xl border border-slate-300 print:shadow-none print:border-none print:p-[8mm] print:max-w-none print:w-full flex flex-col justify-start leading-normal text-black box-border">
        <div className="flex-1 flex flex-col">
          {/* Header & Logo */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="relative w-28 sm:w-32 h-16 shrink-0">
                <img
                  src="/tw-logo.png"
                  alt="TW Logo"
                  className="w-full h-full object-contain object-left"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="space-y-0.5">
                <h1 className="text-sm sm:text-base font-bold text-blue-900 leading-tight">
                  {company.companyNameTh}
                </h1>
                <h2 className="text-xs sm:text-sm font-bold text-blue-900 tracking-wide">
                  {company.companyNameEn}
                </h2>
                <p className="text-[9.5px] sm:text-[10px] text-black whitespace-nowrap">
                  {company.address}
                </p>
                <p className="text-[9.5px] sm:text-[10px] text-black whitespace-nowrap">
                  เบอร์โทร (Tel).{' '}
                  {company.phone?.includes(',')
                    ? company.phone.split(',')[0].trim()
                    : company.phone}{' '}
                  , E-mail {company.email}
                </p>
              </div>
            </div>

            {/* Top Right Rounded Box */}
            <div className="border border-black rounded-xl px-4 sm:px-6 py-2 text-center shrink-0">
              <div className="text-xs sm:text-sm font-bold tracking-wide">Quotation</div>
              <div className="text-xs sm:text-sm font-bold">ใบเสนอราคา</div>
            </div>
          </div>

          {/* Info Block (Customer & Document Details) */}
          <div className="border border-black grid grid-cols-12 text-[9.5px] sm:text-[10px] mb-2">
            {/* Left Column: Customer */}
            <div className="col-span-7 p-1.5 space-y-0.5 border-r border-black">
              <div className="flex">
                <span className="font-bold w-14 sm:w-16 shrink-0">ลูกค้า :</span>
                <span className="font-semibold text-black">
                  {document.customerName || document.customer?.name || '-'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-14 sm:w-16 shrink-0">ที่อยู่ :</span>
                <span className="text-black">
                  {document.customerAddress || document.customer?.address || '-'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-14 sm:w-16 shrink-0">ชื่องาน</span>
                <span className="font-semibold text-black">{document.title}</span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-14 sm:w-16 shrink-0">สถานที่</span>
                <span className="text-black">
                  {document.workingLocation || document.location?.name || '-'}
                </span>
              </div>
              <div className="flex">
                <span className="font-bold w-14 sm:w-16 shrink-0">เรียน</span>
                <span className="font-semibold text-black">
                  {activeRev?.attnName || document.attnName || 'ผู้จัดการฝ่ายวิศวกรรม'}
                </span>
              </div>
            </div>

            {/* Right Column: Meta */}
            <div className="col-span-5 p-1.5 sm:p-2 space-y-0.5">
              <div className="flex justify-between">
                <span className="font-bold">QUOTATION NO :</span>
                <span className="font-bold font-mono text-black">
                  {document.documentNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">วันที่ / DATE :</span>
                <span className="text-black">{formattedDocDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">CONTACT :</span>
                <span className="text-black truncate">
                  {activeRev?.contactPerson || document.contactPerson || 'พิษณุวัชร์ นันทวงศ์การ'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">โทรศัพท์ :</span>
                <span className="text-black font-mono">
                  {activeRev?.contactPhone || document.contactPhone || '088-287-8259'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">หน้า :</span>
                <span className="text-black">{totalPages > 1 ? `1 / ${totalPages}` : '1'}</span>
              </div>
            </div>
          </div>

          {/* Table of BOQ Items */}
          <table className="w-full border-collapse border border-black text-[9.5px] sm:text-[10px] mb-0">
            <thead>
              <tr
                className="bg-[#a9d18e] text-black font-bold text-center border-b border-black"
                style={{
                  backgroundColor: '#a9d18e',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <th
                  rowSpan={2}
                  className="border border-black p-1 w-7 sm:w-8 bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Items
                </th>
                <th
                  rowSpan={2}
                  className="border border-black p-1 text-center bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Description
                </th>
                <th
                  rowSpan={2}
                  className="border border-black p-1 w-9 sm:w-10 text-center bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Unit
                </th>
                <th
                  rowSpan={2}
                  className="border border-black p-1 w-10 sm:w-12 text-center bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Quantity
                </th>
                <th
                  colSpan={2}
                  className="border border-black p-1 text-center bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Material Charge
                </th>
                <th
                  colSpan={2}
                  className="border border-black p-1 text-center bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Labour Charge
                </th>
                <th
                  rowSpan={2}
                  className="border border-black p-1 w-14 sm:w-16 text-center bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Total
                </th>
              </tr>
              <tr
                className="bg-[#a9d18e] text-black font-bold text-center border-b border-black text-[9px] sm:text-[9.5px]"
                style={{
                  backgroundColor: '#a9d18e',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <th
                  className="border border-black p-1 w-12 sm:w-14 bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Qty / Price
                </th>
                <th
                  className="border border-black p-1 w-12 sm:w-14 bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Amount
                </th>
                <th
                  className="border border-black p-1 w-12 sm:w-14 bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Qty/ Price
                </th>
                <th
                  className="border border-black p-1 w-12 sm:w-14 bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {(activeRev?.categories || []).map((cat: any, cIdx: number) => {
                const items = cat.items || [];
                const isSingleItemCategory =
                  items.length === 1 &&
                  (cat.name.trim() === items[0].description?.trim() ||
                    items[0].description?.trim().includes(cat.name.trim()) ||
                    cat.name.trim().includes(items[0].description?.trim()) ||
                    formatDescriptionTitle(cat.name) ===
                      formatDescriptionTitle(items[0].description) ||
                    !items[0].description?.trim());

                if (isSingleItemCategory) {
                  const it = items[0];
                  const q = Number(it.quantity) || 0;
                  const mPrice = Number(it.materialPrice) || 0;
                  const lPrice = Number(it.laborPrice) || 0;
                  const mAmt =
                    it.materialAmount !== undefined && it.materialAmount !== null
                      ? Number(it.materialAmount)
                      : q * mPrice;
                  const lAmt =
                    it.laborAmount !== undefined && it.laborAmount !== null
                      ? Number(it.laborAmount)
                      : q * lPrice;
                  const rowTotal = mAmt + lAmt > 0 ? mAmt + lAmt : Number(it.amount) || 0;

                  return (
                    <tr key={cat.id || cIdx} className="align-top">
                      <td className="border-x border-black p-1 text-center font-mono align-top">
                        {cIdx + 1}
                      </td>
                      <td className="border-r border-black p-1">
                        <div className="font-semibold text-black whitespace-pre-line">
                          {formatDescriptionTitle(cat.name || it.description)}
                        </div>
                        {it.specification && (
                          <div className="text-black whitespace-pre-line pl-2 text-[9px] sm:text-[9.5px]">
                            {it.specification}
                          </div>
                        )}
                      </td>
                      <td className="border-r border-black p-1 text-center font-medium">
                        {it.unit || 'JOB'}
                      </td>
                      <td className="border-r border-black p-1 text-center font-mono">
                        {q || 1}
                      </td>
                      <td className="border-r border-black p-1 text-right font-mono">
                        {mPrice > 0 ? mPrice.toLocaleString('th-TH') : '-'}
                      </td>
                      <td className="border-r border-black p-1 text-right font-mono">
                        {mAmt > 0 ? mAmt.toLocaleString('th-TH') : '-'}
                      </td>
                      <td className="border-r border-black p-1 text-right font-mono">
                        {lPrice > 0 ? lPrice.toLocaleString('th-TH') : '-'}
                      </td>
                      <td className="border-r border-black p-1 text-right font-mono">
                        {lAmt > 0 ? lAmt.toLocaleString('th-TH') : '-'}
                      </td>
                      <td className="border-r border-black p-1 text-right font-mono font-semibold">
                        {rowTotal > 0 ? rowTotal.toLocaleString('th-TH') : '-'}
                      </td>
                    </tr>
                  );
                }

                const isLongTitle = cat.name.length > 45;

                return (
                  <React.Fragment key={cat.id || cIdx}>
                    <tr className="font-bold align-top">
                      <td className="border-x border-black p-1 text-center font-mono">
                        {cIdx + 1}
                      </td>
                      <td
                        colSpan={isLongTitle ? 8 : 1}
                        className={
                          isLongTitle ? 'p-1' : 'border-r border-black p-1'
                        }
                      >
                        <div className="font-bold text-black whitespace-pre-line">
                          {formatDescriptionTitle(cat.name)}
                        </div>
                      </td>
                      {!isLongTitle && (
                        <>
                          <td className="border-r border-black p-1"></td>
                          <td className="border-r border-black p-1"></td>
                          <td className="border-r border-black p-1"></td>
                          <td className="border-r border-black p-1"></td>
                          <td className="border-r border-black p-1"></td>
                          <td className="border-r border-black p-1"></td>
                          <td className="border-r border-black p-1"></td>
                        </>
                      )}
                    </tr>

                    {items.map((it: any, iIdx: number) => {
                      const q = Number(it.quantity) || 0;
                      const mPrice = Number(it.materialPrice) || 0;
                      const lPrice = Number(it.laborPrice) || 0;
                      const mAmt =
                        it.materialAmount !== undefined && it.materialAmount !== null
                          ? Number(it.materialAmount)
                          : q * mPrice;
                      const lAmt =
                        it.laborAmount !== undefined && it.laborAmount !== null
                          ? Number(it.laborAmount)
                          : q * lPrice;
                      const rowTotal = mAmt + lAmt > 0 ? mAmt + lAmt : Number(it.amount) || 0;

                      return (
                        <tr key={it.id || iIdx} className="align-top">
                          <td className="border-x border-black p-1 text-center font-mono"></td>
                          <td className="border-r border-black p-1 pl-3">
                            <div className="text-black whitespace-pre-line">
                              - {it.description}
                            </div>
                            {it.specification && (
                              <div className="text-black whitespace-pre-line pl-3 text-[9px] sm:text-[9.5px]">
                                {it.specification}
                              </div>
                            )}
                          </td>
                          <td className="border-r border-black p-1 text-center font-medium">
                            {it.unit || 'JOB'}
                          </td>
                          <td className="border-r border-black p-1 text-center font-mono">
                            {q || 1}
                          </td>
                          <td className="border-r border-black p-1 text-right font-mono">
                            {mPrice > 0 ? mPrice.toLocaleString('th-TH') : '-'}
                          </td>
                          <td className="border-r border-black p-1 text-right font-mono">
                            {mAmt > 0 ? mAmt.toLocaleString('th-TH') : '-'}
                          </td>
                          <td className="border-r border-black p-1 text-right font-mono">
                            {lPrice > 0 ? lPrice.toLocaleString('th-TH') : '-'}
                          </td>
                          <td className="border-r border-black p-1 text-right font-mono">
                            {lAmt > 0 ? lAmt.toLocaleString('th-TH') : '-'}
                          </td>
                          <td className="border-r border-black p-1 text-right font-mono font-semibold">
                            {rowTotal > 0 ? rowTotal.toLocaleString('th-TH') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Single tall spacer row */}
              <tr style={{ height: `${spacerHeight}mm` }}>
                <td className="border-x border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
              </tr>

              {/* Category subtotal row */}
              <tr
                className="bg-[#b4c6e7] font-bold text-center border-t border-b border-black text-[9.5px] sm:text-[10px]"
                style={{
                  backgroundColor: '#b4c6e7',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <td
                  colSpan={4}
                  className="border-x border-black p-1 text-center font-bold"
                  style={{
                    backgroundColor: '#b4c6e7',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  สรุปหมวดค่าแรงงานและอุปกรณ์
                </td>
                <td
                  className="border-r border-black p-1 font-mono text-center"
                  style={{
                    backgroundColor: '#b4c6e7',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  -
                </td>
                <td
                  className="border-r border-black p-1 text-right font-mono font-bold"
                  style={{
                    backgroundColor: '#b4c6e7',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  {totalMaterial > 0 ? totalMaterial.toLocaleString('th-TH') : '-'}
                </td>
                <td
                  className="border-r border-black p-1 font-mono text-center"
                  style={{
                    backgroundColor: '#b4c6e7',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  -
                </td>
                <td
                  className="border-r border-black p-1 text-right font-mono font-bold"
                  style={{
                    backgroundColor: '#b4c6e7',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  {totalLabour > 0 ? totalLabour.toLocaleString('th-TH') : '-'}
                </td>
                <td
                  className="border-r border-black p-1 text-right font-mono font-bold"
                  style={{
                    backgroundColor: '#b4c6e7',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  {subtotal.toLocaleString('th-TH')}
                </td>
              </tr>

              {/* Remarks & Financial Totals */}
              <tr>
                <td
                  colSpan={4}
                  rowSpan={5}
                  className="border-x border-b border-black p-2 sm:p-2.5 align-top"
                >
                  <div className="space-y-1 text-[9.5px] sm:text-[10px]">
                    <div className="font-bold">
                      หมายเหตุ : {activeRev?.notes || 'ระยะเวลาในการดำเนินงาน 30 วัน'}
                    </div>
                    <div className="font-bold mt-1.5">เงื่อนไขในการชำระเงิน</div>
                    <div className="text-black whitespace-pre-line pl-2">
                      {activeRev?.paymentTerms || '- เบิกหลังส่งมอบงาน เครดิต 30 วัน'}
                    </div>
                  </div>
                </td>

                <td
                  colSpan={4}
                  className="border-r border-b border-black p-1 pl-2 text-left font-semibold text-[9.5px] sm:text-[10px]"
                >
                  ค่าใช้จ่ายทั้งหมด
                </td>
                <td className="border-r border-b border-black p-1 text-right font-mono font-semibold text-[9.5px] sm:text-[10px]">
                  {subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={4}
                  className="border-r border-b border-black p-1 pl-2 text-left font-semibold text-[9.5px] sm:text-[10px]"
                >
                  ค่าดำเนินการและผลกำไร {overheadRate > 0 ? `${overheadRate}%` : ''}
                </td>
                <td className="border-r border-b border-black p-1 text-right font-mono font-semibold text-[9.5px] sm:text-[10px]">
                  {overheadAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={4}
                  className="border-r border-b border-black p-1 pl-2 text-left font-semibold text-[9.5px] sm:text-[10px]"
                >
                  ราคารวมทั้งหมด
                </td>
                <td className="border-r border-b border-black p-1 text-right font-mono font-semibold text-[9.5px] sm:text-[10px]">
                  {totalBeforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={4}
                  className="border-r border-b border-black p-1 pl-2 text-left font-semibold text-[9.5px] sm:text-[10px]"
                >
                  ภาษีมูลค่าเพิ่ม {vatRate}%
                </td>
                <td className="border-r border-b border-black p-1 text-right font-mono font-semibold text-[9.5px] sm:text-[10px]">
                  {vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              <tr>
                <td
                  colSpan={4}
                  className="border-r border-b border-black p-1 pl-2 text-left font-bold text-[9.5px] sm:text-[10px]"
                >
                  รวมยอดเงินทั้งหมด
                </td>
                <td className="border-r border-b border-black p-1 text-right font-mono font-bold text-[9.5px] sm:text-[10px]">
                  {grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 3 Authentic Signature Boxes */}
          <div className="border-x border-b border-black grid grid-cols-3 text-center text-[9.5px] sm:text-[10px] break-inside-avoid page-break-inside-avoid">
            {/* Col 1: ผู้ตกลงรับราคา */}
            <div className="p-2 border-r border-black flex flex-col justify-between h-[88px]">
              <div className="font-bold text-black">ผู้ตกลงรับราคา</div>
              <div className="my-auto flex flex-col items-center justify-center">
                {activeRev?.clientSignatureUrl ? (
                  <img
                    src={activeRev.clientSignatureUrl}
                    alt="Client Signature"
                    className="h-8 object-contain mb-0.5"
                  />
                ) : (
                  <div className="h-8"></div>
                )}
                <div className="w-full border-b border-dashed border-black max-w-[170px] mt-0.5"></div>
              </div>
              <div className="mt-auto flex items-end justify-center gap-1.5 w-full max-w-[170px] mx-auto text-[9px] sm:text-[9.5px]">
                <span className="shrink-0 text-black pb-0.5">วันที่</span>
                <div className="flex-1 border-b border-dashed border-black relative flex items-center justify-center h-3.5">
                  {activeRev?.clientSignedDate ? (
                    <span className="font-mono text-[9px] sm:text-[9.5px] text-black absolute bottom-0.5 text-center">
                      {new Date(activeRev.clientSignedDate).toLocaleDateString('th-TH')}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Col 2: ผู้จัดทำและเสนอราคา */}
            <div className="p-2 border-r border-black flex flex-col justify-between h-[88px]">
              <div className="font-bold text-black">ผู้จัดทำและเสนอราคา</div>
              <div className="my-auto flex flex-col items-center justify-center">
                {activeRev?.preparedSignatureUrl ? (
                  <img
                    src={activeRev.preparedSignatureUrl}
                    alt="Prepared Signature"
                    className="h-8 object-contain mb-0.5"
                  />
                ) : (
                  <div className="font-semibold text-black text-[10px] sm:text-[10.5px] mb-0.5">
                    {activeRev?.preparedBy || 'วรัญญา คำดำ'}
                  </div>
                )}
                <div className="w-full border-b border-dashed border-black max-w-[170px] mt-0.5"></div>
              </div>
              <div className="mt-auto flex items-end justify-center gap-1.5 w-full max-w-[170px] mx-auto text-[9px] sm:text-[9.5px]">
                <span className="shrink-0 text-black pb-0.5">วันที่</span>
                <div className="flex-1 border-b border-dashed border-black relative flex items-center justify-center h-3.5">
                  {activeRev?.preparedDate || formattedDocDate ? (
                    <span className="font-mono text-[9px] sm:text-[9.5px] text-black absolute bottom-0.5 text-center">
                      {activeRev?.preparedDate
                        ? new Date(activeRev.preparedDate).toLocaleDateString('th-TH')
                        : formattedDocDate}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Col 3: บริษัท เทคนิคอล วอเตอร์ จำกัด */}
            <div className="p-2 flex flex-col justify-between h-[88px] relative">
              <div className="font-bold text-black">{company.companyNameTh}</div>
              <div className="my-auto flex flex-col items-center justify-center">
                {activeRev?.approvedSignatureUrl ? (
                  <img
                    src={activeRev.approvedSignatureUrl}
                    alt="Signature"
                    className="h-8 object-contain mb-0.5"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-8"></div>
                )}
                <div className="w-full border-b border-dashed border-black max-w-[170px] mt-0.5"></div>
                <div className="text-[8.5px] sm:text-[9px] font-bold text-black mt-0.5">
                  {activeRev?.approvedBy || 'ผู้มีอำนาจลงนาม / AUTHORIZED SIGNATURE'}
                </div>
              </div>
              <div className="mt-auto flex items-end justify-center gap-1.5 w-full max-w-[170px] mx-auto text-[9px] sm:text-[9.5px]">
                <span className="shrink-0 text-black pb-0.5">วันที่</span>
                <div className="flex-1 border-b border-dashed border-black relative flex items-center justify-center h-3.5">
                  {activeRev?.approvedDate || formattedDocDate ? (
                    <span className="font-mono text-[9px] sm:text-[9.5px] text-black absolute bottom-0.5 text-center">
                      {activeRev?.approvedDate
                        ? new Date(activeRev.approvedDate).toLocaleDateString('th-TH')
                        : formattedDocDate}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Attached Document Reference Note if exists */}
          {activeRev?.attachmentName && (
            <div className="mt-2 text-[10px] sm:text-[10.5px] text-slate-700 bg-blue-50 border border-blue-200 p-2 rounded-lg flex items-center justify-between print:bg-white print:border-none print:p-0 print:text-[9px]">
              <div>
                * เอกสารแนบอ้างอิงในระบบ: <strong>{activeRev.attachmentName}</strong>
              </div>
              {activeRev.attachmentUrl && (
                <a
                  href={activeRev.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="no-print text-blue-700 font-bold hover:underline ml-2"
                >
                  (คลิกดู/พิมพ์ไฟล์แนบต้นฉบับ ↗)
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Photo Pages: Rendered sequentially without table frames; 2 photos per page */}
      {photoPages.map((pagePhotos, pageIdx) => (
        <div
          key={`photo-page-${pageIdx}`}
          className="print-sheet print-break-page w-full max-w-[210mm] mx-auto bg-white p-[8mm] sm:p-[10mm] shadow-xl border border-slate-300 print:shadow-none print:border-none print:p-[8mm] print:max-w-none print:w-full flex flex-col justify-start leading-normal text-black box-border"
        >
          {/* Header & Logo */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="relative w-28 sm:w-32 h-16 shrink-0">
                <img
                  src="/tw-logo.png"
                  alt="TW Logo"
                  className="w-full h-full object-contain object-left"
                />
              </div>

              <div className="space-y-0.5">
                <h1 className="text-sm sm:text-base font-bold text-blue-900 leading-tight">
                  {company.companyNameTh}
                </h1>
                <h2 className="text-xs sm:text-sm font-bold text-blue-900 tracking-wide">
                  {company.companyNameEn}
                </h2>
                <p className="text-[9.5px] sm:text-[10px] text-black whitespace-nowrap">
                  {company.address}
                </p>
                <p className="text-[9.5px] sm:text-[10px] text-black whitespace-nowrap">
                  เบอร์โทร (Tel).{' '}
                  {company.phone?.includes(',')
                    ? company.phone.split(',')[0].trim()
                    : company.phone}{' '}
                  , E-mail {company.email}
                </p>
              </div>
            </div>

            {/* Top Right Rounded Box */}
            <div className="border border-black rounded-xl px-5 sm:px-7 py-2 text-center shrink-0">
              <div className="text-xs sm:text-sm font-bold tracking-wide">Quotation</div>
              <div className="text-xs sm:text-sm font-bold">ใบเสนอราคา</div>
            </div>
          </div>

          {/* Info Block */}
          <div className="border border-black grid grid-cols-12 text-[9.5px] sm:text-[10px] mb-2">
            <div className="col-span-7 p-1.5 space-y-0.5 border-r border-black">
              <div className="flex">
                <span className="font-bold w-14 sm:w-16 shrink-0">ลูกค้า :</span>
                <span className="font-semibold text-black">
                  {document.customerName || document.customer?.name || '-'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-14 sm:w-16 shrink-0">ที่อยู่ :</span>
                <span className="text-black">
                  {document.customerAddress || document.customer?.address || '-'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-14 sm:w-16 shrink-0">ชื่องาน</span>
                <span className="font-semibold text-black">{document.title}</span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-14 sm:w-16 shrink-0">สถานที่</span>
                <span className="text-black">
                  {document.workingLocation || document.location?.name || '-'}
                </span>
              </div>
              <div className="flex">
                <span className="font-bold w-14 sm:w-16 shrink-0">เรียน</span>
                <span className="font-semibold text-black">
                  {activeRev?.attnName || document.attnName || 'ผู้จัดการฝ่ายวิศวกรรม'}
                </span>
              </div>
            </div>

            <div className="col-span-5 p-1.5 sm:p-2 space-y-0.5">
              <div className="flex justify-between">
                <span className="font-bold">QUOTATION NO :</span>
                <span className="font-bold font-mono text-black">
                  {document.documentNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">วันที่ / DATE :</span>
                <span className="text-black">{formattedDocDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">CONTACT :</span>
                <span className="text-black truncate">
                  {activeRev?.contactPerson || document.contactPerson || 'พิษณุวัชร์ นันทวงศ์การ'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">โทรศัพท์ :</span>
                <span className="text-black font-mono">
                  {activeRev?.contactPhone || document.contactPhone || '088-287-8259'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">หน้า :</span>
                <span className="text-black">{`${pageIdx + 2} / ${totalPages}`}</span>
              </div>
            </div>
          </div>

          {/* Green Table Header */}
          <table className="w-full border-collapse border border-black text-[9.5px] sm:text-[10px] mb-3">
            <thead>
              <tr
                className="bg-[#a9d18e] text-black font-bold text-center border-b border-black"
                style={{
                  backgroundColor: '#a9d18e',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <th
                  rowSpan={2}
                  className="border border-black p-1 w-7 sm:w-8 bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Items
                </th>
                <th
                  rowSpan={2}
                  className="border border-black p-1 text-center bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Description
                </th>
                <th
                  rowSpan={2}
                  className="border border-black p-1 w-9 sm:w-10 text-center bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Unit
                </th>
                <th
                  rowSpan={2}
                  className="border border-black p-1 w-10 sm:w-12 text-center bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Quantity
                </th>
                <th
                  colSpan={2}
                  className="border border-black p-1 text-center bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Material Charge
                </th>
                <th
                  colSpan={2}
                  className="border border-black p-1 text-center bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Labour Charge
                </th>
                <th
                  rowSpan={2}
                  className="border border-black p-1 w-14 sm:w-16 text-center bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Total
                </th>
              </tr>
              <tr
                className="bg-[#a9d18e] text-black font-bold text-center border-b border-black text-[9px] sm:text-[9.5px]"
                style={{
                  backgroundColor: '#a9d18e',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
              >
                <th
                  className="border border-black p-1 w-12 sm:w-14 bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Qty / Price
                </th>
                <th
                  className="border border-black p-1 w-12 sm:w-14 bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Amount
                </th>
                <th
                  className="border border-black p-1 w-12 sm:w-14 bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Qty/ Price
                </th>
                <th
                  className="border border-black p-1 w-12 sm:w-14 bg-[#a9d18e]"
                  style={{
                    backgroundColor: '#a9d18e',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
          </table>

          {/* Photos Area */}
          <div className="flex-1 flex flex-col items-center justify-start py-3 gap-5">
            {pagePhotos.map((photoUrl, pIdx) => (
              <div key={pIdx} className="w-full flex items-center justify-center">
                <img
                  src={photoUrl}
                  alt={`ภาพถ่ายประกอบที่ ${pageIdx * 2 + pIdx + 1}`}
                  className="max-h-[96mm] max-w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
