'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { calculateDocumentTotals } from '@/lib/calculations';
import {
  GitBranch,
  Plus,
  Trash2,
  Copy,
  Layers,
  Save,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Upload,
  Camera,
  Image as ImageIcon,
  PenTool,
} from 'lucide-react';
import Link from 'next/link';
import { SignaturePadModal } from '@/components/SignaturePadModal';

interface BoqItemInput {
  itemNo: number;
  description: string;
  specification: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  notes: string;
}

interface CategoryInput {
  name: string;
  items: BoqItemInput[];
}

export default function NewRevisionPage() {
  const { id } = useParams() as { id: string };
  const { user, loading } = useAuth();
  const router = useRouter();

  const [document, setDocument] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  // Revision specific
  const [revisionReason, setRevisionReason] = useState('');
  const [sourceRevisionId, setSourceRevisionId] = useState('');
  const [nextRevisionCode, setNextRevisionCode] = useState('Rev.01');

  // Form states
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [preparedSignatureUrl, setPreparedSignatureUrl] = useState('');
  const [preparedDate, setPreparedDate] = useState(new Date().toISOString().slice(0, 10));

  const [checkedBy, setCheckedBy] = useState('');
  const [checkedSignatureUrl, setCheckedSignatureUrl] = useState('');
  const [checkedDate, setCheckedDate] = useState('');

  const [approvedBy, setApprovedBy] = useState('');
  const [approvedSignatureUrl, setApprovedSignatureUrl] = useState('');
  const [approvedDate, setApprovedDate] = useState(new Date().toISOString().slice(0, 10));

  const [clientSignerName, setClientSignerName] = useState('');
  const [clientSignatureUrl, setClientSignatureUrl] = useState('');
  const [clientSignedDate, setClientSignedDate] = useState('');

  const [signModalConfig, setSignModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    onSave: (url: string) => void;
  }>({
    isOpen: false,
    title: '',
    onSave: () => {},
  });

  const handleUploadSignature = async (
    file: File,
    onSuccess: (url: string) => void
  ) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        onSuccess(data.url);
      } else {
        alert(data.error || 'อัปโหลดรูปลายเซ็นไม่สำเร็จ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปลายเซ็น');
    }
  };

  const [paymentTerms, setPaymentTerms] = useState('');
  const [executionDuration, setExecutionDuration] = useState('');
  const [warrantyDuration, setWarrantyDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [sitePhotoUrl, setSitePhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setSitePhotoUrl(data.url);
      } else {
        alert(data.error || 'อัปโหลดรูปภาพล้มเหลว');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const [vatRate, setVatRate] = useState(7.0);
  const [isVatIncluded, setIsVatIncluded] = useState(false);
  const [discountType, setDiscountType] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [discountValue, setDiscountValue] = useState(0);

  const [categories, setCategories] = useState<CategoryInput[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user && id) {
      fetch(`/api/documents/${id}`)
        .then((r) => r.json())
        .then((data) => {
          const doc = data.document;
          if (doc) {
            setDocument(doc);
            const latestRev = doc.revisions?.[0];
            if (latestRev) {
              setSourceRevisionId(latestRev.id);
              const nextNum = (doc.revisions?.length || 1);
              setNextRevisionCode(`Rev.${String(nextNum).padStart(2, '0')}`);

              setPreparedBy(user.name);
              setPreparedSignatureUrl(latestRev.preparedSignatureUrl || '');
              setPreparedDate(new Date().toISOString().slice(0, 10));

              setCheckedBy(latestRev.checkedBy || '');
              setCheckedSignatureUrl(latestRev.checkedSignatureUrl || '');
              setCheckedDate(latestRev.checkedDate ? new Date(latestRev.checkedDate).toISOString().slice(0, 10) : '');

              setApprovedBy(latestRev.approvedBy || 'ผู้มีอำนาจลงนาม / AUTHORIZED SIGNATURE');
              setApprovedSignatureUrl(latestRev.approvedSignatureUrl || '/tw-signature.png');
              setApprovedDate(new Date().toISOString().slice(0, 10));

              setClientSignerName(latestRev.clientSignerName || '');
              setClientSignatureUrl(latestRev.clientSignatureUrl || '');
              setClientSignedDate(latestRev.clientSignedDate ? new Date(latestRev.clientSignedDate).toISOString().slice(0, 10) : '');
              setPaymentTerms(latestRev.paymentTerms || '');
              setExecutionDuration(latestRev.executionDuration || '');
              setWarrantyDuration(latestRev.warrantyDuration || '');
              setNotes(latestRev.notes || '');
              setSitePhotoUrl(latestRev.sitePhotoUrl || '');
              setVatRate(latestRev.vatRate);
              setIsVatIncluded(latestRev.isVatIncluded);
              setDiscountType(latestRev.discountType as any);
              setDiscountValue(latestRev.discountValue);

              const formatted = (latestRev.categories || []).map((c: any) => ({
                name: c.name,
                items: (c.items || []).map((it: any) => ({
                  itemNo: it.itemNo,
                  description: it.description,
                  specification: it.specification || '',
                  unit: it.unit || 'งาน',
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
                  amount: it.amount,
                  notes: it.notes || '',
                })),
              }));
              setCategories(formatted);
            }
          }
        })
        .finally(() => setFetching(false));
    }
  }, [user, loading, id]);

  // Handle switching source revision
  const handleSourceRevisionChange = (revId: string) => {
    setSourceRevisionId(revId);
    const chosen = document?.revisions?.find((r: any) => r.id === revId);
    if (chosen) {
      setPaymentTerms(chosen.paymentTerms || '');
      setExecutionDuration(chosen.executionDuration || '');
      setWarrantyDuration(chosen.warrantyDuration || '');
      setNotes(chosen.notes || '');
      setSitePhotoUrl(chosen.sitePhotoUrl || '');
      setVatRate(chosen.vatRate);
      setIsVatIncluded(chosen.isVatIncluded);
      setDiscountType(chosen.discountType as any);
      setDiscountValue(chosen.discountValue);

      const formatted = (chosen.categories || []).map((c: any) => ({
        name: c.name,
        items: (c.items || []).map((it: any) => ({
          itemNo: it.itemNo,
          description: it.description,
          specification: it.specification || '',
          unit: it.unit || 'งาน',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: it.amount,
          notes: it.notes || '',
        })),
      }));
      setCategories(formatted);
    }
  };

  // Category and item edits
  const addCategory = () => {
    setCategories([
      ...categories,
      {
        name: `${categories.length + 1}. หมวดงานใหม่`,
        items: [
          {
            itemNo: 1,
            description: '',
            specification: '',
            unit: 'งาน',
            quantity: 1,
            unitPrice: 0,
            amount: 0,
            notes: '',
          },
        ],
      },
    ]);
  };

  const removeCategory = (cIdx: number) => {
    if (categories.length <= 1) return alert('ต้องมีหมวดงานอย่างน้อย 1 หมวด');
    setCategories(categories.filter((_, idx) => idx !== cIdx));
  };

  const addItem = (cIdx: number) => {
    const copy = [...categories];
    copy[cIdx].items.push({
      itemNo: copy[cIdx].items.length + 1,
      description: '',
      specification: '',
      unit: 'งาน',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      notes: '',
    });
    setCategories(copy);
  };

  const removeItem = (cIdx: number, iIdx: number) => {
    const copy = [...categories];
    if (copy[cIdx].items.length <= 1) return alert('ต้องมีรายการอย่างน้อย 1 แถว');
    copy[cIdx].items = copy[cIdx].items.filter((_, idx) => idx !== iIdx);
    copy[cIdx].items.forEach((it, idx) => {
      it.itemNo = idx + 1;
    });
    setCategories(copy);
  };

  const updateItemField = (cIdx: number, iIdx: number, field: keyof BoqItemInput, val: any) => {
    const copy = [...categories];
    const target = { ...copy[cIdx].items[iIdx], [field]: val };
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(val) || 0 : target.quantity;
      const p = field === 'unitPrice' ? Number(val) || 0 : target.unitPrice;
      target.amount = Math.round(q * p * 100) / 100;
    }
    copy[cIdx].items[iIdx] = target;
    setCategories(copy);
  };

  // Calculation
  const flat = categories.flatMap((c) =>
    c.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice }))
  );
  const totals = calculateDocumentTotals({
    items: flat,
    vatRate,
    isVatIncluded,
    discountType,
    discountValue,
  });

  const isOldBranch =
    sourceRevisionId &&
    document?.revisions?.[0] &&
    sourceRevisionId !== document.revisions[0].id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionReason.trim()) {
      alert('กรุณาระบุเหตุผลในการแก้ไข Revision (เช่น ปรับราคาต่อหน่วยตามเจรจา, ปรับลดปริมาณงานหน้างาน)');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        revisionReason: revisionReason.trim(),
        sourceRevisionId,
        documentDate,
        expiryDate: expiryDate || null,
        preparedBy,
        preparedSignatureUrl,
        preparedDate: preparedDate || null,
        checkedBy,
        checkedSignatureUrl,
        checkedDate: checkedDate || null,
        approvedBy,
        approvedSignatureUrl,
        approvedDate: approvedDate || null,
        clientSignerName,
        clientSignatureUrl,
        clientSignedDate: clientSignedDate || null,
        sitePhotoUrl: sitePhotoUrl.trim() || null,
        notes,
        paymentTerms,
        executionDuration,
        warrantyDuration,
        vatRate,
        isVatIncluded,
        discountType,
        discountValue,
        categories,
      };

      const res = await fetch(`/api/documents/${id}/revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(`สร้าง ${nextRevisionCode} สำเร็จเรียบร้อย!`);
        router.push(`/documents/${id}`);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการสร้าง Revision');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  if (loading || fetching || !document) {
    return <div className="p-12 text-center text-slate-400">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="flex-1 flex flex-col pb-24">
      <Header
        title={`สร้าง Revision ใหม่สำหรับเอกสาร ${document.documentNumber}`}
        subtitle={`เลขที่เอกสารหลักเดิม: ${document.documentNumber} | เวอร์ชันที่จะถูกสร้าง: ${nextRevisionCode}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/documents/${id}`}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              ยกเลิก
            </Link>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
            >
              <GitBranch className="w-4 h-4" />
              {saving ? 'กำลังบันทึก...' : `บันทึกและสร้าง ${nextRevisionCode}`}
            </button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Revision Reason Header Card */}
        <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded bg-indigo-700 text-indigo-100 text-xs font-bold uppercase tracking-wider">
                Option B: สร้าง Revision ใหม่
              </span>
              <h2 className="text-xl font-bold mt-1">
                สร้าง {nextRevisionCode} สำหรับโครงการ: {document.title}
              </h2>
            </div>
            <div className="text-xs text-indigo-200 text-right">
              ผู้สร้าง Revision: <strong className="text-white">{user?.name}</strong>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-bold text-indigo-100 mb-1">
              เหตุผลในการแก้ไข Revision นี้ <span className="text-amber-400">* (บังคับกรอก)</span>
            </label>
            <input
              type="text"
              required
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="เช่น ปรับลดราคาอุปกรณ์ 5% ตามการเจรจา, ปรับสเปคท่อแอร์ตามแบบใหม่, เพิ่มรายการเดินท่อบายพาส"
              className="w-full bg-white text-slate-900 px-3.5 py-2.5 rounded-lg text-xs md:text-sm font-medium focus:ring-2 focus:ring-indigo-300 focus:outline-none"
            />
          </div>

          {/* Base revision selection */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-indigo-200">
            <span>คัดลอกข้อมูลเริ่มต้นมาจาก:</span>
            <select
              value={sourceRevisionId}
              onChange={(e) => handleSourceRevisionChange(e.target.value)}
              className="bg-indigo-800 text-white border border-indigo-600 rounded px-2.5 py-1 text-xs font-medium"
            >
              {document.revisions?.map((rev: any) => (
                <option key={rev.id} value={rev.id}>
                  {rev.revisionCode} {rev.isLatest ? '(ฉบับล่าสุด)' : ''} - {rev.revisionReason} (฿
                  {rev.grandTotal?.toLocaleString('th-TH')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Warning if branching from an old revision */}
        {isOldBranch && (
          <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl text-amber-900 text-xs shadow-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong>คำเตือน:</strong> คุณกำลังสร้าง Revision โดยต่อยอดจากฉบับเก่าที่ไม่ได้เป็นฉบับล่าสุด
              กรุณาตรวจสอบว่าท่านต้องการย้อนกลับไปใช้โครงสร้างของฉบับเก่าดังกล่าวจริงหรือไม่
            </div>
          </div>
        )}

        {/* Section: BOQ Items Table for new revision */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                ปรับปรุงรายการงานและราคาสำหรับ {nextRevisionCode}
              </h3>
              <p className="text-xs text-slate-500">
                ข้อมูล Revision เก่าจะถูกล็อคถาวรและไม่ถูกแก้ไขตาม
              </p>
            </div>

            <button
              type="button"
              onClick={addCategory}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มหมวดงานใหม่
            </button>
          </div>

          <div className="space-y-6">
            {categories.map((cat, cIdx) => (
              <div
                key={cIdx}
                className="rounded-xl border border-slate-200 overflow-hidden shadow-xs bg-white"
              >
                <div className="bg-slate-100 p-3 flex items-center justify-between gap-2 border-b border-slate-200">
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => {
                      const copy = [...categories];
                      copy[cIdx].name = e.target.value;
                      setCategories(copy);
                    }}
                    className="font-bold text-xs text-slate-800 bg-transparent border-b border-dashed border-slate-400 focus:outline-none w-full max-w-md px-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeCategory(cIdx)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="p-2.5 text-center w-12">ลำดับ</th>
                        <th className="p-2.5 text-left min-w-[220px]">รายการงาน</th>
                        <th className="p-2.5 text-left min-w-[180px]">Specification</th>
                        <th className="p-2.5 text-center w-24">หน่วย</th>
                        <th className="p-2.5 text-right w-24">จำนวน</th>
                        <th className="p-2.5 text-right w-32">ราคาต่อหน่วย</th>
                        <th className="p-2.5 text-right w-32">จำนวนเงิน</th>
                        <th className="p-2.5 text-center w-16">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cat.items.map((it, iIdx) => (
                        <tr key={iIdx} className="hover:bg-slate-50/70">
                          <td className="p-2 text-center text-slate-400 font-mono">{it.itemNo}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={it.description}
                              onChange={(e) =>
                                updateItemField(cIdx, iIdx, 'description', e.target.value)
                              }
                              className="w-full border border-slate-200 rounded p-1.5 text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={it.specification}
                              onChange={(e) =>
                                updateItemField(cIdx, iIdx, 'specification', e.target.value)
                              }
                              className="w-full border border-slate-200 rounded p-1.5 text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="text"
                              value={it.unit}
                              onChange={(e) => updateItemField(cIdx, iIdx, 'unit', e.target.value)}
                              className="w-full border border-slate-200 rounded p-1.5 text-xs text-center"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="any"
                              value={it.quantity}
                              onChange={(e) =>
                                updateItemField(cIdx, iIdx, 'quantity', e.target.value)
                              }
                              className="w-full border border-slate-200 rounded p-1.5 text-xs text-right font-mono"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="any"
                              value={it.unitPrice}
                              onChange={(e) =>
                                updateItemField(cIdx, iIdx, 'unitPrice', e.target.value)
                              }
                              className="w-full border border-slate-200 rounded p-1.5 text-xs text-right font-mono"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            ฿{it.amount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(cIdx, iIdx)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-2 bg-slate-50 border-t border-slate-200 flex justify-center">
                  <button
                    type="button"
                    onClick={() => addItem(cIdx)}
                    className="px-3 py-1 rounded bg-white text-slate-700 text-xs font-semibold border border-slate-300"
                  >
                    + เพิ่มแถวรายการ
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing breakdown */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider">
                ภาษีและส่วนลด
              </h4>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={vatRate === 7.0}
                    onChange={() => setVatRate(7.0)}
                  />
                  <span>คิด VAT 7%</span>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={vatRate === 0} onChange={() => setVatRate(0)} />
                  <span>ไม่คิด VAT (0%)</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-semibold">ส่วนลด:</span>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="border border-slate-300 rounded px-2 py-1 bg-white"
                >
                  <option value="PERCENT">เปอร์เซ็นต์ (%)</option>
                  <option value="AMOUNT">จำนวนเงิน (฿)</option>
                </select>
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                  className="w-28 border border-slate-300 rounded px-2 py-1 text-right font-mono bg-white"
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">รวมเป็นเงิน:</span>
                <span className="font-mono font-bold">
                  ฿{totals.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">ส่วนลด:</span>
                <span className="font-mono font-bold text-rose-600">
                  -฿{totals.discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">VAT {vatRate}%:</span>
                <span className="font-mono font-bold">
                  ฿{totals.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-slate-300 text-sm">
                <span className="font-bold">ยอดสุทธิ {nextRevisionCode}:</span>
                <span className="font-mono font-extrabold text-indigo-900 text-base">
                  ฿{totals.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-2 rounded bg-indigo-50 text-indigo-950 font-medium text-center">
                ({totals.thaiBahtText})
              </div>
            </div>
          </div>

          {/* Signatures & Attached Photo */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                ลายเซ็นดิจิทัลและผู้ลงนาม (Signatures & Approvals)
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                สามารถกรอกชื่อ กำหนดวันที่ และแนบรูปภาพลายเซ็นดิจิทัลสำหรับแต่ละคน เพื่อแสดงผลท้ายเอกสารและ PDF
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. ผู้ตกลงรับราคา */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">1. ผู้ตกลงรับราคา</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">Customer / Client</span>
                </div>
                <p className="text-[11px] text-slate-500">สามารถเขียนชื่อ หรือแนบรูปลายเซ็น (หรือเว้นไว้เซ็นสด)</p>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อ-นามสกุล ผู้ตกลงรับราคา</label>
                  <input
                    type="text"
                    value={clientSignerName}
                    onChange={(e) => setClientSignerName(e.target.value)}
                    placeholder="เช่น นายสมชาย ใจดี หรือเว้นว่างหากเซ็นสด"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">วันที่ตกลงรับราคา</label>
                  <input
                    type="date"
                    value={clientSignedDate}
                    onChange={(e) => setClientSignedDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">รูปลายเซ็นดิจิทัล (ถ้ามี)</label>
                  {clientSignatureUrl ? (
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-2">
                      <div className="flex items-center justify-center bg-slate-50/60 rounded p-1.5 min-h-[50px]">
                        <img src={clientSignatureUrl} alt="ลายเซ็นลูกค้า" className="h-10 max-w-[140px] object-contain" />
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSignModalConfig({
                                isOpen: true,
                                title: 'เซ็นลายเซ็นผู้ตกลงรับราคา',
                                onSave: (url) => setClientSignatureUrl(url),
                              })
                            }
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1"
                          >
                            <PenTool className="w-3 h-3 text-slate-600" />
                            <span>เซ็นใหม่</span>
                          </button>
                          <label className="cursor-pointer px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1">
                            <Upload className="w-3 h-3 text-slate-600" />
                            <span>แนบไฟล์ใหม่</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadSignature(f, setClientSignatureUrl);
                                e.target.value = '';
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => setClientSignatureUrl('')}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="ลบลายเซ็น"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSignModalConfig({
                            isOpen: true,
                            title: 'เซ็นลายเซ็นผู้ตกลงรับราคา',
                            onSave: (url) => setClientSignatureUrl(url),
                          })
                        }
                        className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-[11px] font-semibold transition shadow-2xs"
                      >
                        <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                        <span>เซ็นสด</span>
                      </button>
                      <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>แนบไฟล์</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadSignature(f, setClientSignatureUrl);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. ผู้จัดทำและเสนอราคา */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">2. ผู้จัดทำและเสนอราคา</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">Prepared By</span>
                </div>
                <p className="text-[11px] text-slate-500">เลือกพิมพ์ชื่อลงในช่อง หรือแนบรูปลายเซ็นดิจิทัล</p>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อ-นามสกุล ผู้จัดทำ</label>
                  <input
                    type="text"
                    value={preparedBy}
                    onChange={(e) => setPreparedBy(e.target.value)}
                    placeholder="เช่น วรัญญา คำดำ"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">วันที่เสนอราคา</label>
                  <input
                    type="date"
                    value={preparedDate}
                    onChange={(e) => setPreparedDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">รูปลายเซ็นดิจิทัล (ถ้ามี)</label>
                  {preparedSignatureUrl ? (
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-2">
                      <div className="flex items-center justify-center bg-slate-50/60 rounded p-1.5 min-h-[50px]">
                        <img src={preparedSignatureUrl} alt="ลายเซ็นผู้จัดทำ" className="h-10 max-w-[140px] object-contain" />
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSignModalConfig({
                                isOpen: true,
                                title: 'เซ็นลายเซ็นผู้จัดทำและเสนอราคา',
                                onSave: (url) => setPreparedSignatureUrl(url),
                              })
                            }
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1"
                          >
                            <PenTool className="w-3 h-3 text-slate-600" />
                            <span>เซ็นใหม่</span>
                          </button>
                          <label className="cursor-pointer px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1">
                            <Upload className="w-3 h-3 text-slate-600" />
                            <span>แนบไฟล์ใหม่</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadSignature(f, setPreparedSignatureUrl);
                                e.target.value = '';
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreparedSignatureUrl('')}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="ลบลายเซ็น"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSignModalConfig({
                            isOpen: true,
                            title: 'เซ็นลายเซ็นผู้จัดทำและเสนอราคา',
                            onSave: (url) => setPreparedSignatureUrl(url),
                          })
                        }
                        className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-blue-300 bg-white hover:bg-blue-50 text-blue-800 text-[11px] font-semibold transition shadow-2xs"
                      >
                        <PenTool className="w-3.5 h-3.5 text-blue-600" />
                        <span>เซ็นสด</span>
                      </button>
                      <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>แนบไฟล์</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadSignature(f, setPreparedSignatureUrl);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. บริษัท เทคนิคอล วอเตอร์ จำกัด */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">3. บริษัท เทคนิคอล วอเตอร์ จำกัด</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold">Authorized</span>
                </div>
                <p className="text-[11px] text-slate-500">ผู้มีอำนาจลงนาม พร้อมลายเซ็นและตราประทับบริษัท</p>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">ชื่อ / ตำแหน่ง</label>
                  <input
                    type="text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    placeholder="เช่น ผู้มีอำนาจลงนาม / AUTHORIZED SIGNATURE"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">วันที่อนุมัติ</label>
                  <input
                    type="date"
                    value={approvedDate}
                    onChange={(e) => setApprovedDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">รูปลายเซ็น + ตราประทับ</label>
                  {approvedSignatureUrl ? (
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col gap-2">
                      <div className="flex items-center justify-center bg-slate-50/60 rounded p-1.5 min-h-[50px]">
                        <img src={approvedSignatureUrl} alt="ลายเซ็น" className="h-10 max-w-[140px] object-contain" />
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSignModalConfig({
                                isOpen: true,
                                title: 'เซ็นลายเซ็นผู้มีอำนาจลงนาม',
                                onSave: (url) => setApprovedSignatureUrl(url),
                              })
                            }
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1"
                          >
                            <PenTool className="w-3 h-3 text-slate-600" />
                            <span>เซ็นใหม่</span>
                          </button>
                          <label className="cursor-pointer px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium inline-flex items-center gap-1">
                            <Upload className="w-3 h-3 text-slate-600" />
                            <span>แนบไฟล์ใหม่</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadSignature(f, setApprovedSignatureUrl);
                                e.target.value = '';
                              }}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => setApprovedSignatureUrl('')}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="ลบลายเซ็น"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSignModalConfig({
                            isOpen: true,
                            title: 'เซ็นลายเซ็นผู้มีอำนาจลงนาม',
                            onSave: (url) => setApprovedSignatureUrl(url),
                          })
                        }
                        className="flex items-center justify-center gap-1.5 p-2 rounded-lg border border-purple-300 bg-white hover:bg-purple-50 text-purple-800 text-[11px] font-semibold transition shadow-2xs"
                      >
                        <PenTool className="w-3.5 h-3.5 text-purple-600" />
                        <span>เซ็นสด</span>
                      </button>
                      <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>แนบไฟล์</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadSignature(f, setApprovedSignatureUrl);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Photo attachment section */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                รูปภาพประกอบหน้างาน / อุปกรณ์ (แนบท้ายใบเสนอราคา)
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingPhoto ? 'กำลังอัปโหลด...' : (sitePhotoUrl ? 'เปลี่ยนรูปภาพประกอบ' : '+ เลือกรูปภาพจากเครื่อง')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {sitePhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setSitePhotoUrl('')}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบรูปภาพ</span>
                  </button>
                )}

                <span className="text-[11px] text-slate-400">
                  รองรับไฟล์รูปภาพ JPG, PNG, WebP เพื่อแนบท้ายเอกสารและ PDF
                </span>
              </div>

              {sitePhotoUrl && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 inline-block">
                  <img
                    src={sitePhotoUrl}
                    alt="รูปภาพประกอบ"
                    className="max-h-48 rounded object-contain border border-slate-300 bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href={`/documents/${id}`}
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
          >
            ยกเลิก
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : `บันทึกและสร้าง ${nextRevisionCode}`}
          </button>
        </div>
      </div>

      {/* Signature Pad Modal */}
      <SignaturePadModal
        isOpen={signModalConfig.isOpen}
        title={signModalConfig.title}
        onClose={() => setSignModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onSave={signModalConfig.onSave}
      />
    </div>
  );
}
