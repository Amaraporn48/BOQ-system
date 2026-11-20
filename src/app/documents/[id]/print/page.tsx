'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Printer, ArrowLeft, FileText, ExternalLink, Download } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { parseSitePhotos } from '@/lib/photoUtils';

// Helper to strip duplicate leading numbering like "1. ", "1) ", "1- " so the Items column alone holds the number
const formatDescriptionTitle = (text: string) => {
  if (!text) return '';
  return text.replace(/^\s*\d+[\.\)\-\:\s]+\s*/, '').trim() || text.trim();
};

function DocumentPrintContent() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const revId = searchParams.get('revId');
  const viewParam = searchParams.get('view');

  const [document, setDocument] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [printView, setPrintView] = useState<'attachment' | 'form'>('form');

  useEffect(() => {
    Promise.all([
      fetch(`/api/documents/${id}`).then(async (r) => ({ status: r.status, data: await r.json() })),
      fetch('/api/settings').then(async (r) => ({ status: r.status, data: await r.json() })),
    ])
      .then(([docRes, settsRes]) => {
        if (docRes.status === 401 || settsRes.status === 401) {
          setUnauthorized(true);
          router.replace('/login');
          return;
        }
        const doc = docRes.data?.document;
        setDocument(doc);
        setSettings(settsRes.data?.settings);

        if (doc) {
          let rev = doc.revisions?.[0];
          if (revId && doc.revisions) {
            const matched = doc.revisions.find((r: any) => r.id === revId);
            if (matched) rev = matched;
          }
          const hasAtt = Boolean(rev?.attachmentUrl);
          if (viewParam === 'form') {
            setPrintView('form');
          } else if (hasAtt) {
            setPrintView('attachment');
          } else {
            setPrintView('form');
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load document for print:', err);
      })
      .finally(() => setFetching(false));
  }, [id, revId, viewParam]);

  useEffect(() => {
    // Ensure parent <main> element background stays slate-200 so scrolling remains uniform
    const mainEl = window.document.querySelector('main');
    if (mainEl) {
      const prevBg = mainEl.style.backgroundColor;
      mainEl.style.backgroundColor = '#e2e8f0';
      return () => {
        mainEl.style.backgroundColor = prevBg;
      };
    }
  }, []);

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-12 text-center text-slate-500">
        <div className="space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium">กำลังเตรียมเอกสาร PDF...</p>
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center text-slate-600">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-800">กรุณาเข้าสู่ระบบก่อนเปิดดูเอกสาร</h3>
          <p className="text-xs text-slate-500">กำลังนำทางไปยังหน้าเข้าสู่ระบบ...</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            ไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center text-slate-600">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-800">ไม่พบเอกสารนี้ในระบบ</h3>
          <p className="text-xs text-slate-500">
            เอกสารอาจถูกลบไปแล้ว หรือรหัสเอกสารไม่ถูกต้อง
          </p>
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้ารายการเอกสาร
          </Link>
        </div>
      </div>
    );
  }

  let activeRev = document.revisions?.[0];
  if (revId && document.revisions) {
    const matched = document.revisions.find((r: any) => r.id === revId);
    if (matched) activeRev = matched;
  }

  const company = settings || {
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
      const mAmt = it.materialAmount !== undefined && it.materialAmount !== null
        ? Number(it.materialAmount)
        : q * mPrice;
      const lAmt = it.laborAmount !== undefined && it.laborAmount !== null
        ? Number(it.laborAmount)
        : q * lPrice;

      totalMaterial += mAmt;
      totalLabour += lAmt;
      totalCombined += (mAmt + lAmt > 0 ? (mAmt + lAmt) : (Number(it.amount) || 0));
    });
  });

  const subtotal = totalCombined > 0 ? totalCombined : (activeRev?.subtotal || 0);
  const overheadRate = activeRev?.overheadRate !== undefined ? Number(activeRev.overheadRate) : 10.0;
  const overheadAmount = activeRev?.overheadAmount !== undefined && activeRev?.overheadAmount > 0
    ? Number(activeRev.overheadAmount)
    : Math.round((subtotal * overheadRate) / 100 * 100) / 100;
  const totalBeforeVat = activeRev?.totalBeforeVat || (subtotal + overheadAmount);
  const vatRate = Number(activeRev?.vatRate) || 7.0;
  const vatAmount = activeRev?.vatAmount || Math.round((totalBeforeVat * vatRate) / 100 * 100) / 100;
  const grandTotal = activeRev?.grandTotal || (totalBeforeVat + vatAmount);

  const formattedDocDate = activeRev?.documentDate
    ? new Date(activeRev.documentDate).toLocaleDateString('th-TH')
    : new Date().toLocaleDateString('th-TH');

  const hasAttachment = Boolean(activeRev?.attachmentUrl);
  const isPdf = Boolean(
    activeRev?.attachmentName?.toLowerCase().endsWith('.pdf') ||
    activeRev?.attachmentUrl?.toLowerCase().includes('.pdf')
  );
  const isImage = Boolean(
    /\.(jpg|jpeg|png|webp|svg)$/i.test(activeRev?.attachmentName || activeRev?.attachmentUrl || '')
  );

  const photos = parseSitePhotos(activeRev?.sitePhotoUrl);
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

  // Account for extra lines in payment terms (up to 2 lines fit in standard total box, extra lines reduce spacer)
  const paymentLines = (activeRev?.paymentTerms || '').split('\n').filter(Boolean).length;
  const extraPaymentLines = Math.max(0, paymentLines - 2);

  // Calculate dynamic spacer height so vertical lines run straight down elegantly without overflowing A4 (297mm)
  const spacerHeight = Math.max(6, Math.round(88 - effectiveItemLines * 5.5 - extraPaymentLines * 4.5));

  return (
    <div className="w-full flex-1 shrink-0 min-h-screen bg-slate-200 py-6 print:p-0 print:bg-white text-black font-sans text-[11px]">
      {/* Top action bar (hidden during print) */}
      <div className="no-print max-w-[210mm] lg:max-w-5xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-300 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push(`/documents/${id}`);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            กลับ
          </button>
          <span className="text-xs text-slate-600">
            เอกสาร: <strong>{document.documentNumber}</strong> ({activeRev?.revisionCode})
          </span>
        </div>

        {/* Attachment indicator if exists */}
        {hasAttachment && (
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold text-emerald-800">
            <FileText className="w-3.5 h-3.5" />
            <span>📄 ไฟล์แนบต้นฉบับ ({activeRev?.attachmentName || 'ไฟล์แนบ'})</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {hasAttachment ? (
            <>
              <a
                href={activeRev.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition"
              >
                <Printer className="w-4 h-4" />
                <span>เปิดพิมพ์ไฟล์ต้นฉบับเต็มจอ (Print PDF)</span>
              </a>
              <a
                href={activeRev.attachmentUrl}
                download={activeRev.attachmentName}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด</span>
              </a>
            </>
          ) : (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
            >
              <Printer className="w-4 h-4" />
              พิมพ์ / บันทึกเป็น PDF (Print to PDF)
            </button>
          )}
        </div>
      </div>

      {/* Attachment View */}
      {hasAttachment && (
        <div className="max-w-[210mm] lg:max-w-5xl mx-auto space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">{activeRev.attachmentName}</h3>
                <p className="text-xs text-slate-500">เอกสารแนบต้นฉบับสัญญา / BOQ เดิมที่แนบไว้กับโครงการนี้</p>
              </div>
            </div>
            <a
              href={activeRev.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
            >
              <ExternalLink className="w-4 h-4" />
              เปิดหน้าต่างใหม่เพื่อสั่งพิมพ์ (Print)
            </a>
          </div>

          {isPdf ? (
            <div className="bg-white rounded-xl border border-slate-300 shadow-xl overflow-hidden">
              <iframe
                src={activeRev.attachmentUrl}
                className="w-full h-[85vh] border-0"
                title="Attached Document Preview"
              />
            </div>
          ) : isImage ? (
            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xl flex justify-center">
              <img
                src={activeRev.attachmentUrl}
                alt="Attached Document"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
          ) : (
            <div className="bg-white p-10 rounded-xl border border-slate-300 shadow-xl text-center space-y-4">
              <FileText className="w-14 h-14 text-blue-600 mx-auto" />
              <h4 className="font-bold text-base text-slate-800">{activeRev.attachmentName}</h4>
              <p className="text-xs text-slate-500">ไฟล์แนบเป็นไฟล์เอกสารสำนักงาน (Excel / Word)</p>
              <a
                href={activeRev.attachmentUrl}
                download={activeRev.attachmentName}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
              >
                <Download className="w-4 h-4" />
                ดาวน์โหลดไฟล์ต้นฉบับ
              </a>
            </div>
          )}
        </div>
      )}

      {/* Form View (System Generated Quotation Sheet) - Only rendered when there is NO attachment file */}
      {!hasAttachment && (
      <div className="print-sheet max-w-[210mm] mx-auto bg-white p-[10mm] shadow-2xl print:shadow-none print:p-[8mm] print:max-w-none print:w-full flex flex-col justify-start leading-normal text-black box-border min-h-[270mm] sm:min-h-[275mm] print:min-h-0 print:h-auto">
        {/* Main Quotation Container */}
        <div className="flex-1 flex flex-col">
          {/* Header & Logo */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="relative w-32 h-16 shrink-0">
                <img
                  src="/tw-logo.png"
                  alt="TW Logo"
                  className="w-full h-full object-contain object-left"
                  onError={(e) => {
                    // fallback if local image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div className="space-y-0.5">
                <h1 className="text-base font-bold text-blue-900 leading-tight">
                  {company.companyNameTh}
                </h1>
                <h2 className="text-sm font-bold text-blue-900 tracking-wide">
                  {company.companyNameEn}
                </h2>
                <p className="text-[10px] text-black whitespace-nowrap">
                  {company.address}
                </p>
                <p className="text-[10px] text-black whitespace-nowrap">
                  เบอร์โทร (Tel). {company.phone?.includes(',') ? company.phone.split(',')[0].trim() : company.phone} , E-mail {company.email}
                </p>
              </div>
            </div>

            {/* Top Right Rounded Box */}
            <div className="border border-black rounded-xl px-6 py-2 text-center shrink-0">
              <div className="text-sm font-bold tracking-wide">Quotation</div>
              <div className="text-sm font-bold">ใบเสนอราคา</div>
            </div>
          </div>

          {/* Info Block (Customer & Document Details) */}
          <div className="border border-black grid grid-cols-12 text-[10px] mb-2">
            {/* Left Column: Customer */}
            <div className="col-span-7 p-1.5 space-y-0.5 border-r border-black">
              <div className="flex">
                <span className="font-bold w-16 shrink-0">ลูกค้า :</span>
                <span className="font-semibold text-black">
                  {document.customerName || document.customer?.name || '-'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-16 shrink-0">ที่อยู่ :</span>
                <span className="text-black">
                  {document.customerAddress || document.customer?.address || '-'}
                </span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-16 shrink-0">ชื่องาน</span>
                <span className="font-semibold text-black">{document.title}</span>
              </div>
              <div className="flex items-start">
                <span className="font-bold w-16 shrink-0">สถานที่</span>
                <span className="text-black">
                  {document.workingLocation || document.location?.name || '-'}
                </span>
              </div>
              <div className="flex">
                <span className="font-bold w-16 shrink-0">เรียน</span>
                <span className="font-semibold text-black">
                  {activeRev?.attnName || document.attnName || 'ผู้จัดการฝ่ายวิศวกรรม'}
                </span>
              </div>
            </div>

            {/* Right Column: Meta */}
            <div className="col-span-5 p-2 space-y-0.5">
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
                <span className="text-black">
                  {activeRev?.contactPerson || document.contactPerson || 'พิษณุวัชร์ นันทวงศ์การ'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">โทรศัพท์ :</span>
                <span className="text-black">
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
          <table className="w-full border-collapse border border-black text-[10px] mb-0">
            <thead>
              {/* Row 1 of Table Header */}
              <tr
                className="bg-[#a9d18e] text-black font-bold text-center border-b border-black"
                style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <th rowSpan={2} className="border border-black p-1 w-8 bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Items</th>
                <th rowSpan={2} className="border border-black p-1 text-center bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Description</th>
                <th rowSpan={2} className="border border-black p-1 w-10 text-center bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Unit</th>
                <th rowSpan={2} className="border border-black p-1 w-12 text-center bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Quantity</th>
                <th colSpan={2} className="border border-black p-1 text-center bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Material Charge</th>
                <th colSpan={2} className="border border-black p-1 text-center bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Labour Charge</th>
                <th rowSpan={2} className="border border-black p-1 w-16 text-center bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Total</th>
              </tr>
              {/* Row 2 of Table Header */}
              <tr
                className="bg-[#a9d18e] text-black font-bold text-center border-b border-black text-[9.5px]"
                style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <th className="border border-black p-1 w-14 bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Qty / Price</th>
                <th className="border border-black p-1 w-14 bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Amount</th>
                <th className="border border-black p-1 w-14 bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Qty/ Price</th>
                <th className="border border-black p-1 w-14 bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(activeRev?.categories || []).map((cat: any, cIdx: number) => {
                const items = cat.items || [];
                // Check if this category represents a direct single line item (e.g. Item 2: งาน Protection)
                const isSingleItemCategory =
                  items.length === 1 &&
                  (cat.name.trim() === items[0].description?.trim() ||
                    items[0].description?.trim().includes(cat.name.trim()) ||
                    cat.name.trim().includes(items[0].description?.trim()) ||
                    formatDescriptionTitle(cat.name) === formatDescriptionTitle(items[0].description) ||
                    !items[0].description?.trim());

                if (isSingleItemCategory) {
                  // Render directly as the numbered line item on ONE single line!
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
                          <div className="text-black whitespace-pre-line pl-2 text-[9.5px]">
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

                // If content is not long (<= 45 chars) that would overlap into Unit:
                // "ถ้าเนื้อหาไม่ได้ยาวทับเส้นก็ขีดตรงเลยไม่ต้องเว้น"
                const isLongTitle = cat.name.length > 45;

                return (
                  <React.Fragment key={cat.id || cIdx}>
                    {/* Category Header Row */}
                    <tr className="font-bold align-top">
                      <td className="border-x border-black p-1 text-center font-mono">
                        {cIdx + 1}
                      </td>
                      {isLongTitle ? (
                        <td colSpan={2} className="border-r border-black p-1 font-bold text-black align-top">
                          {formatDescriptionTitle(cat.name)}
                        </td>
                      ) : (
                        <>
                          <td className="border-r border-black p-1 font-bold text-black align-top">
                            {formatDescriptionTitle(cat.name)}
                          </td>
                          <td className="border-r border-black p-1"></td>
                        </>
                      )}
                      <td className="border-r border-black p-1"></td>
                      <td className="border-r border-black p-1"></td>
                      <td className="border-r border-black p-1"></td>
                      <td className="border-r border-black p-1"></td>
                      <td className="border-r border-black p-1"></td>
                      <td className="border-r border-black p-1"></td>
                    </tr>

                    {/* Items Rows */}
                    {items.map((it: any) => {
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

                      const rawSubDesc = (it.description || '').trim();
                      const isSelfSub = rawSubDesc === (cat.name || '').trim() || formatDescriptionTitle(rawSubDesc) === formatDescriptionTitle(cat.name || '');
                      const cleanedSubDesc = rawSubDesc.replace(/^[\s\-•]+/, '').trim();
                      const formattedSubDesc =
                        isSelfSub
                          ? rawSubDesc
                          : cleanedSubDesc
                          ? `- ${cleanedSubDesc}`
                          : '';

                      return (
                        <tr key={it.id} className="align-top">
                          <td className="border-x border-black p-1 text-center font-mono text-slate-500"></td>
                          <td className="border-r border-black p-1">
                            <div className={`text-black whitespace-pre-line ${isSelfSub ? 'font-bold' : 'font-normal pl-2'}`}>
                              {formattedSubDesc}
                            </div>
                            {it.specification && (
                              <div className="text-black whitespace-pre-line pl-2 text-[9.5px]">
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
                          {/* Material Charge */}
                          <td className="border-r border-black p-1 text-right font-mono">
                            {mPrice > 0 ? mPrice.toLocaleString('th-TH') : '-'}
                          </td>
                          <td className="border-r border-black p-1 text-right font-mono">
                            {mAmt > 0 ? mAmt.toLocaleString('th-TH') : '-'}
                          </td>
                          {/* Labour Charge */}
                          <td className="border-r border-black p-1 text-right font-mono">
                            {lPrice > 0 ? lPrice.toLocaleString('th-TH') : '-'}
                          </td>
                          <td className="border-r border-black p-1 text-right font-mono">
                            {lAmt > 0 ? lAmt.toLocaleString('th-TH') : '-'}
                          </td>
                          {/* Total */}
                          <td className="border-r border-black p-1 text-right font-mono font-semibold">
                            {rowTotal > 0 ? rowTotal.toLocaleString('th-TH') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* Single tall spacer row extending vertical column lines to the bottom WITHOUT any horizontal lines */}
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

              {/* Summary Row for Material and Labour (Blue background matching authentic TW sample) */}
              <tr
                className="border border-black font-bold text-[10px] bg-[#b4c6e7]"
                style={{ backgroundColor: '#b4c6e7', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
              >
                <td
                  colSpan={4}
                  className="border border-black p-1.5 text-center font-bold bg-[#b4c6e7]"
                  style={{ backgroundColor: '#b4c6e7', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  สรุปหมวดค่าแรงงานและอุปกรณ์
                </td>
                <td
                  className="border border-black p-1.5 text-center bg-[#b4c6e7]"
                  style={{ backgroundColor: '#b4c6e7', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  -
                </td>
                <td
                  className="border border-black p-1.5 text-right font-mono bg-[#b4c6e7]"
                  style={{ backgroundColor: '#b4c6e7', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  {totalMaterial > 0 ? totalMaterial.toLocaleString('th-TH') : '-'}
                </td>
                <td
                  className="border border-black p-1.5 text-center bg-[#b4c6e7]"
                  style={{ backgroundColor: '#b4c6e7', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  -
                </td>
                <td
                  className="border border-black p-1.5 text-right font-mono bg-[#b4c6e7]"
                  style={{ backgroundColor: '#b4c6e7', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  {totalLabour > 0 ? totalLabour.toLocaleString('th-TH') : '-'}
                </td>
                <td
                  className="border border-black p-1.5 text-right font-mono bg-[#b4c6e7]"
                  style={{ backgroundColor: '#b4c6e7', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  {subtotal.toLocaleString('th-TH')}
                </td>
              </tr>

              {/* Remarks & Financial Totals Rows (inside table so all vertical lines align 100% straight) */}
              <tr>
                {/* Left side: Remarks & Terms (Spans columns 1 to 4) */}
                <td colSpan={4} rowSpan={5} className="border-x border-b border-black p-2.5 align-top">
                  <div className="space-y-1 text-[10px]">
                    <div className="font-bold">
                      หมายเหตุ : {activeRev?.notes || 'ระยะเวลาในการดำเนินงาน 30 วัน'}
                    </div>
                    <div className="font-bold mt-1.5">เงื่อนไขในการชำระเงิน</div>
                    <div className="text-black whitespace-pre-line pl-2">
                      {activeRev?.paymentTerms || '- เบิกหลังส่งมอบงาน เครดิต 30 วัน'}
                    </div>
                  </div>
                </td>

                {/* Right side: Row 1 - ค่าใช้จ่ายทั้งหมด */}
                <td colSpan={4} className="border-r border-b border-black p-1 pl-2 text-left font-semibold text-[10px]">
                  ค่าใช้จ่ายทั้งหมด
                </td>
                <td className="border-r border-b border-black p-1 text-right font-mono font-semibold text-[10px]">
                  {subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Right side: Row 2 - ค่าดำเนินการและผลกำไร */}
              <tr>
                <td colSpan={4} className="border-r border-b border-black p-1 pl-2 text-left font-semibold text-[10px]">
                  ค่าดำเนินการและผลกำไร
                </td>
                <td className="border-r border-b border-black p-1 text-right font-mono font-semibold text-[10px]">
                  {overheadAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Right side: Row 3 - ราคารวมทั้งหมด */}
              <tr>
                <td colSpan={4} className="border-r border-b border-black p-1 pl-2 text-left font-semibold text-[10px]">
                  ราคารวมทั้งหมด
                </td>
                <td className="border-r border-b border-black p-1 text-right font-mono font-semibold text-[10px]">
                  {totalBeforeVat.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Right side: Row 4 - ภาษีมูลค่าเพิ่ม 7% */}
              <tr>
                <td colSpan={4} className="border-r border-b border-black p-1 pl-2 text-left font-semibold text-[10px]">
                  ภาษีมูลค่าเพิ่ม {vatRate}%
                </td>
                <td className="border-r border-b border-black p-1 text-right font-mono font-semibold text-[10px]">
                  {vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Right side: Row 5 - รวมยอดเงินทั้งหมด */}
              <tr>
                <td colSpan={4} className="border-r border-b border-black p-1 pl-2 text-left font-bold text-[10px]">
                  รวมยอดเงินทั้งหมด
                </td>
                <td className="border-r border-b border-black p-1 text-right font-mono font-bold text-[11px] underline">
                  {grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signature Box (Strictly 3 Columns matching authentic quotation - directly attached to table bottom with 0px gap) */}
          <div className="border-x border-b border-black grid grid-cols-3 text-center text-[10px] bg-white print:break-inside-avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            {/* Col 1: ผู้ตกลงรับราคา */}
            <div className="p-2 sm:p-2.5 pb-2.5 border-r border-black flex flex-col justify-between min-h-[110px]">
              <div className="font-bold text-black h-5 flex items-center justify-center">
                ผู้ตกลงรับราคา
              </div>
              <div className="flex-1 flex flex-col items-center justify-end">
                <div className="h-9 flex items-end justify-center mb-1">
                  {activeRev?.clientSignatureUrl ? (
                    <img
                      src={activeRev.clientSignatureUrl}
                      alt="Client Signature"
                      className="h-8 max-w-[150px] object-contain"
                    />
                  ) : null}
                </div>
                <div className="w-[160px] border-b border-dashed border-black mx-auto"></div>
                <div className="h-4 flex items-center justify-center text-[9px] sm:text-[9.5px] text-black font-medium mt-0.5">
                  {activeRev?.clientSignerName ? `(${activeRev.clientSignerName})` : ''}
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 w-[160px] mx-auto text-[9px] sm:text-[9.5px] mt-2">
                <span className="shrink-0 text-black">วันที่</span>
                <div className="flex-1 border-b border-dashed border-black relative flex items-center justify-center h-4">
                  {activeRev?.clientSignedDate ? (
                    <span className="font-mono text-[9.5px] text-black absolute bottom-0.5 text-center">
                      {new Date(activeRev.clientSignedDate).toLocaleDateString('th-TH')}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Col 2: ผู้จัดทำและเสนอราคา */}
            <div className="p-2 sm:p-2.5 pb-2.5 border-r border-black flex flex-col justify-between min-h-[110px]">
              <div className="font-bold text-black h-5 flex items-center justify-center">
                ผู้จัดทำและเสนอราคา
              </div>
              <div className="flex-1 flex flex-col items-center justify-end">
                <div className="h-9 flex items-end justify-center mb-1">
                  {activeRev?.preparedSignatureUrl ? (
                    <img
                      src={activeRev.preparedSignatureUrl}
                      alt="Prepared Signature"
                      className="h-8 max-w-[150px] object-contain"
                    />
                  ) : null}
                </div>
                <div className="w-[160px] border-b border-dashed border-black mx-auto"></div>
                <div className="h-4 flex items-center justify-center text-[9px] sm:text-[9.5px] text-black font-medium mt-0.5">
                  ({activeRev?.preparedBy || 'วรัญญา คำดำ'})
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 w-[160px] mx-auto text-[9px] sm:text-[9.5px] mt-2">
                <span className="shrink-0 text-black">วันที่</span>
                <div className="flex-1 border-b border-dashed border-black relative flex items-center justify-center h-4">
                  {activeRev?.preparedDate || formattedDocDate ? (
                    <span className="font-mono text-[9.5px] text-black absolute bottom-0.5 text-center">
                      {activeRev?.preparedDate
                        ? new Date(activeRev.preparedDate).toLocaleDateString('th-TH')
                        : formattedDocDate}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Col 3: บริษัท เทคนิคอล วอเตอร์ จำกัด */}
            <div className="p-2 sm:p-2.5 pb-2.5 flex flex-col justify-between min-h-[110px]">
              <div className="font-bold text-black h-5 flex items-center justify-center">
                {company.companyNameTh}
              </div>
              <div className="flex-1 flex flex-col items-center justify-end">
                <div className="h-9 flex items-end justify-center mb-1">
                  {activeRev?.approvedSignatureUrl ? (
                    <img
                      src={activeRev.approvedSignatureUrl}
                      alt="Signature"
                      className="h-8 max-w-[150px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                </div>
                <div className="w-[160px] border-b border-dashed border-black mx-auto"></div>
                <div className="h-4 flex items-center justify-center text-[8.5px] sm:text-[9px] font-bold text-black mt-0.5">
                  ({activeRev?.approvedBy || 'ผู้มีอำนาจลงนาม / AUTHORIZED SIGNATURE'})
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 w-[160px] mx-auto text-[9px] sm:text-[9.5px] mt-2">
                <span className="shrink-0 text-black">วันที่</span>
                <div className="flex-1 border-b border-dashed border-black relative flex items-center justify-center h-4">
                  {activeRev?.approvedDate || formattedDocDate ? (
                    <span className="font-mono text-[9.5px] text-black absolute bottom-0.5 text-center">
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
            <div className="mt-2 text-[10.5px] text-slate-700 bg-blue-50 border border-blue-200 p-2 rounded-lg flex items-center justify-between print:bg-white print:border-none print:p-0 print:text-[9px]">
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
      )}

      {/* Photo Pages: Rendered sequentially without table frames; 2 photos per page, breaks to next page if more */}
      {!hasAttachment &&
        photoPages.map((pagePhotos, pageIdx) => (
          <div
            key={`photo-page-${pageIdx}`}
            className="print-sheet print-break-page max-w-[210mm] mx-auto bg-white p-[10mm] shadow-2xl print:shadow-none print:p-[8mm] print:max-w-none print:w-full flex flex-col justify-start leading-normal text-black box-border mt-6 print:mt-0"
          >
            {/* Header & Logo (Identical to Page 1) */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="relative w-32 h-16 shrink-0">
                  <img
                    src="/tw-logo.png"
                    alt="TW Logo"
                    className="w-full h-full object-contain object-left"
                  />
                </div>

                <div className="space-y-0.5">
                  <h1 className="text-base font-bold text-blue-900 leading-tight">
                    {company.companyNameTh}
                  </h1>
                  <h2 className="text-sm font-bold text-blue-900 tracking-wide">
                    {company.companyNameEn}
                  </h2>
                  <p className="text-[10px] text-black whitespace-nowrap">
                    {company.address}
                  </p>
                  <p className="text-[10px] text-black whitespace-nowrap">
                    เบอร์โทร (Tel). {company.phone?.includes(',') ? company.phone.split(',')[0].trim() : company.phone} , E-mail {company.email}
                  </p>
                </div>
              </div>

              {/* Top Right Rounded Box */}
              <div className="border border-black rounded-xl px-7 py-2.5 text-center shrink-0">
                <div className="text-sm font-bold tracking-wide">Quotation</div>
                <div className="text-sm font-bold">ใบเสนอราคา</div>
              </div>
            </div>

            {/* Info Block (Identical to Page 1) */}
            <div className="border border-black grid grid-cols-12 text-[10px] mb-2">
              <div className="col-span-7 p-1.5 space-y-0.5 border-r border-black">
                <div className="flex">
                  <span className="font-bold w-16 shrink-0">ลูกค้า :</span>
                  <span className="font-semibold text-black">
                    {document.customerName || document.customer?.name || '-'}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="font-bold w-16 shrink-0">ที่อยู่ :</span>
                  <span className="text-black">
                    {document.customerAddress || document.customer?.address || '-'}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="font-bold w-16 shrink-0">ชื่องาน</span>
                  <span className="font-semibold text-black">{document.title}</span>
                </div>
                <div className="flex items-start">
                  <span className="font-bold w-16 shrink-0">สถานที่</span>
                  <span className="text-black">
                    {document.workingLocation || document.location?.name || '-'}
                  </span>
                </div>
                <div className="flex">
                  <span className="font-bold w-16 shrink-0">เรียน</span>
                  <span className="font-semibold text-black">
                    {activeRev?.attnName || document.attnName || 'ผู้จัดการฝ่ายวิศวกรรม'}
                  </span>
                </div>
              </div>

              <div className="col-span-5 p-2 space-y-0.5">
                <div className="flex justify-between">
                  <span className="font-bold">QUOTATION NO :</span>
                  <span className="font-bold font-mono text-black">{document.documentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">วันที่ / DATE :</span>
                  <span className="text-black">{formattedDocDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">CONTACT :</span>
                  <span className="text-black">
                    {activeRev?.contactPerson || document.contactPerson || 'พิษณุวัชร์ นันทวงศ์การ'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">โทรศัพท์ :</span>
                  <span className="text-black">
                    {activeRev?.contactPhone || document.contactPhone || '088-287-8259'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">หน้า :</span>
                  <span className="text-black">{`${pageIdx + 2} / ${totalPages}`}</span>
                </div>
              </div>
            </div>

            {/* Green Table Header (matching authentic TW sample) */}
            <table className="w-full border-collapse border border-black text-[10px] mb-3">
              <thead>
                {/* Row 1 of Table Header */}
                <tr
                  className="bg-[#a9d18e] text-black font-bold text-center border-b border-black"
                  style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  <th rowSpan={2} className="border border-black p-1 w-8 bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Items</th>
                  <th rowSpan={2} className="border border-black p-1 text-center bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Description</th>
                  <th rowSpan={2} className="border border-black p-1 w-10 text-center bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Unit</th>
                  <th rowSpan={2} className="border border-black p-1 w-12 text-center bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Quantity</th>
                  <th colSpan={2} className="border border-black p-1 text-center bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Material Charge</th>
                  <th colSpan={2} className="border border-black p-1 text-center bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Labour Charge</th>
                  <th rowSpan={2} className="border border-black p-1 w-16 text-center bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Total</th>
                </tr>
                {/* Row 2 of Table Header */}
                <tr
                  className="bg-[#a9d18e] text-black font-bold text-center border-b border-black text-[9.5px]"
                  style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
                >
                  <th className="border border-black p-1 w-14 bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Qty / Price</th>
                  <th className="border border-black p-1 w-14 bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Amount</th>
                  <th className="border border-black p-1 w-14 bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Qty/ Price</th>
                  <th className="border border-black p-1 w-14 bg-[#a9d18e]" style={{ backgroundColor: '#a9d18e', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Amount</th>
                </tr>
              </thead>
            </table>

            {/* Photos Area: Photos aligned straight down vertically in a single column with uniform size */}
            <div className="flex-1 flex flex-col items-center justify-start py-3 gap-5">
              {pagePhotos.map((photoUrl, pIdx) => (
                <div
                  key={pIdx}
                  className="w-full flex items-center justify-center"
                >
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

export default function DocumentPrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">กำลังเตรียมเอกสาร PDF...</div>}>
      <DocumentPrintContent />
    </Suspense>
  );
}
