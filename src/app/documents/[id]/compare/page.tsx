'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import {
  History,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Check,
  Building,
} from 'lucide-react';
import Link from 'next/link';

function CompareRevisionsContent() {
  const { id } = useParams() as { id: string };
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [document, setDocument] = useState<any>(null);
  const [revAId, setRevAId] = useState(searchParams.get('revA') || '');
  const [revBId, setRevBId] = useState(searchParams.get('revB') || '');
  const [diffData, setDiffData] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user && id) {
      fetch(`/api/documents/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setDocument(data.document);
          const revs = data.document?.revisions || [];
          if (revs.length >= 2) {
            if (!revAId) setRevAId(revs[1].id);
            if (!revBId) setRevBId(revs[0].id);
          } else if (revs.length === 1) {
            setRevAId(revs[0].id);
            setRevBId(revs[0].id);
          }
        });
    }
  }, [user, loading, id]);

  const loadComparison = async (a: string, b: string) => {
    if (!a || !b) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/documents/${id}/compare?revA=${a}&revB=${b}`);
      if (res.ok) {
        const data = await res.json();
        setDiffData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (revAId && revBId) {
      loadComparison(revAId, revBId);
    }
  }, [revAId, revBId]);

  if (loading || !document) {
    return <div className="p-12 text-center text-slate-400">กำลังโหลด...</div>;
  }

  const summary = diffData?.summary;

  return (
    <div className="flex-1 flex flex-col pb-24">
      <Header
        title={`เปรียบเทียบ Revision: ${document.documentNumber}`}
        subtitle={`โครงการ: ${document.title} | ตรวจสอบความแตกต่างระหว่างเวอร์ชันอย่างละเอียด`}
        actions={
          <Link
            href={`/documents/${id}`}
            className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            กลับสู่หน้ารายละเอียดเอกสาร
          </Link>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Revision Selector Bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                ฉบับตั้งต้น (Revision เดิม):
              </label>
              <select
                value={revAId}
                onChange={(e) => setRevAId(e.target.value)}
                className="border-2 border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-slate-50 text-slate-800"
              >
                {document.revisions?.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.revisionCode} ({r.revisionReason}) - ฿
                    {r.grandTotal?.toLocaleString('th-TH')}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4">
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                ฉบับเปรียบเทียบ (Revision ใหม่):
              </label>
              <select
                value={revBId}
                onChange={(e) => setRevBId(e.target.value)}
                className="border-2 border-blue-600 rounded-lg px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-950"
              >
                {document.revisions?.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.revisionCode} ({r.revisionReason}) - ฿
                    {r.grandTotal?.toLocaleString('th-TH')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            ระบบคำนวณส่วนต่างของยอดรวม รายการที่เพิ่ม รายการที่ตัดออก และราคาที่เปลี่ยนแปลงให้อัตโนมัติ
          </div>
        </div>

        {fetching || !diffData ? (
          <div className="p-12 text-center text-slate-400">กำลังเปรียบเทียบข้อมูล...</div>
        ) : (
          <>
            {/* Financial Delta Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Grand Total Comparison */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  ยอดรวมสุทธิ (Grand Total)
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-500">
                      เดิม: ฿{summary.grandTotalA?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                      ใหม่: ฿{summary.grandTotalB?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1 font-mono font-bold text-sm ${
                      summary.grandTotalDiff > 0
                        ? 'text-emerald-600'
                        : summary.grandTotalDiff < 0
                        ? 'text-rose-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {summary.grandTotalDiff > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : summary.grandTotalDiff < 0 ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : null}
                    {summary.grandTotalDiff > 0 ? '+' : ''}
                    ฿{summary.grandTotalDiff?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Subtotal Comparison */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  ยอดรวมก่อนหักส่วนลด (Subtotal)
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-500">
                      เดิม: ฿{summary.subtotalA?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">
                      ใหม่: ฿{summary.subtotalB?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-600">
                    {summary.subtotalDiff > 0 ? '+' : ''}฿
                    {summary.subtotalDiff?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Discount Comparison */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  ส่วนลด (Discount)
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-500">
                      เดิม: ฿{summary.discountA?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">
                      ใหม่: ฿{summary.discountB?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-600">
                    {summary.discountDiff > 0 ? '+' : ''}฿
                    {summary.discountDiff?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* VAT Comparison */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  ภาษีมูลค่าเพิ่ม (VAT 7%)
                </span>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <div className="text-xs text-slate-500">
                      เดิม: ฿{summary.vatA?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-lg font-bold text-slate-900 mt-0.5">
                      ใหม่: ฿{summary.vatB?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-600">
                    {summary.vatDiff > 0 ? '+' : ''}฿
                    {summary.vatDiff?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Commercial terms diff */}
            {(summary.termsChanged || summary.durationChanged || summary.warrantyChanged) && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs">
                <h4 className="font-bold text-amber-900">การเปลี่ยนแปลงเงื่อนไขทางการค้า:</h4>
                {summary.durationChanged && (
                  <div>
                    • <strong>ระยะเวลาดำเนินงาน:</strong> จาก "{summary.durationA || '-'}" เปลี่ยนเป็น "
                    <span className="font-bold text-amber-900">{summary.durationB}</span>"
                  </div>
                )}
                {summary.warrantyChanged && (
                  <div>
                    • <strong>ระยะเวลารับประกัน:</strong> จาก "{summary.warrantyA || '-'}" เปลี่ยนเป็น "
                    <span className="font-bold text-amber-900">{summary.warrantyB}</span>"
                  </div>
                )}
                {summary.termsChanged && (
                  <div>
                    • <strong>เงื่อนไขการชำระเงิน:</strong> จาก "{summary.termsA || '-'}" เปลี่ยนเป็น "
                    <span className="font-bold text-amber-900">{summary.termsB}</span>"
                  </div>
                )}
              </div>
            )}

            {/* Detailed Items Diff Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">
                  ตารางเปรียบเทียบรายการงาน (Items Diff Breakdown)
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    เพิ่มรายการ (Added)
                  </span>
                  <span className="inline-flex items-center gap-1 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    ลบรายการ (Removed)
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    แก้ไขราคา/จำนวน (Modified)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="p-3 text-center w-28">สถานะ</th>
                      <th className="p-3 text-left min-w-[200px]">หมวด / รายการงาน</th>
                      <th className="p-3 text-right w-24">จำนวน ({diffData.revisionA.code})</th>
                      <th className="p-3 text-right w-24">จำนวน ({diffData.revisionB.code})</th>
                      <th className="p-3 text-right w-28">ราคาเดิม (฿)</th>
                      <th className="p-3 text-right w-28">ราคาใหม่ (฿)</th>
                      <th className="p-3 text-right w-32">ผลต่างจำนวนเงิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {diffData.itemDiffs?.map((d: any, idx: number) => {
                      let rowBg = 'bg-white';
                      let badge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          คงเดิม
                        </span>
                      );

                      if (d.type === 'ADDED') {
                        rowBg = 'bg-emerald-50/50';
                        badge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            + เพิ่มรายการ
                          </span>
                        );
                      } else if (d.type === 'REMOVED') {
                        rowBg = 'bg-rose-50/50';
                        badge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            - ลบรายการ
                          </span>
                        );
                      } else if (d.type === 'MODIFIED') {
                        rowBg = 'bg-amber-50/40';
                        badge = (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            ปรับเปลี่ยน
                          </span>
                        );
                      }

                      return (
                        <tr key={idx} className={`${rowBg} transition`}>
                          <td className="p-3 text-center whitespace-nowrap">{badge}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{d.description}</div>
                            <div className="text-[11px] text-slate-400">{d.category}</div>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            {d.itemA ? `${d.itemA.quantity} ${d.itemA.unit}` : '-'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {d.itemB ? `${d.itemB.quantity} ${d.itemB.unit}` : '-'}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            {d.itemA
                              ? `฿${d.itemA.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                              : '-'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {d.itemB
                              ? `฿${d.itemB.unitPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
                              : '-'}
                          </td>
                          <td
                            className={`p-3 text-right font-mono font-bold whitespace-nowrap ${
                              d.deltaAmount > 0
                                ? 'text-emerald-600'
                                : d.deltaAmount < 0
                                ? 'text-rose-600'
                                : 'text-slate-500'
                            }`}
                          >
                            {d.deltaAmount > 0 ? '+' : ''}
                            ฿{d.deltaAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CompareRevisionsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">กำลังโหลด...</div>}>
      <CompareRevisionsContent />
    </Suspense>
  );
}
