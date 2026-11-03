'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { StatusBadge, DocTypeBadge, RevisionBadge } from '@/components/StatusBadge';
import {
  FileText,
  Edit3,
  Copy,
  GitBranch,
  Printer,
  History,
  Layers,
  Building,
  MapPin,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Trash2,
  Camera,
  Paperclip,
  ExternalLink,
  FileDown,
} from 'lucide-react';

export default function DocumentDetailPage() {
  const { id } = useParams() as { id: string };
  const { user, loading } = useAuth();
  const router = useRouter();

  const [document, setDocument] = useState<any>(null);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'boq' | 'revisions' | 'audit'>('boq');
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Status Change Dropdown
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

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
        const targetRev = document?.revisions?.find((r: any) => r.id === selectedRevisionId) || document?.revisions?.[0];
        const saveRes = await fetch(`/api/documents/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            revisionId: targetRev?.id,
            sitePhotoUrl: data.url,
          }),
        });
        if (saveRes.ok) {
          await fetchDocument();
        } else {
          alert('ไม่สามารถบันทึกรูปภาพลงเอกสารได้');
        }
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

  const handleRemovePhoto = async () => {
    if (!confirm('คุณต้องการลบรูปภาพประกอบนี้ใช่หรือไม่?')) return;
    setUploadingPhoto(true);
    try {
      const targetRev = document?.revisions?.find((r: any) => r.id === selectedRevisionId) || document?.revisions?.[0];
      const saveRes = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revisionId: targetRev?.id,
          sitePhotoUrl: null,
        }),
      });
      if (saveRes.ok) {
        await fetchDocument();
      } else {
        alert('ไม่สามารถลบรูปภาพได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการลบรูปภาพ');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const targetRev = document?.revisions?.find((r: any) => r.id === selectedRevisionId) || document?.revisions?.[0];
        const saveRes = await fetch(`/api/documents/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            revisionId: targetRev?.id,
            attachmentUrl: data.url,
            attachmentName: data.name || file.name,
            attachmentSize: data.size || file.size,
          }),
        });
        if (saveRes.ok) {
          await fetchDocument();
        } else {
          alert('ไม่สามารถบันทึกไฟล์แนบลงเอกสารได้');
        }
      } else {
        alert(data.error || 'อัปโหลดไฟล์ล้มเหลว');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async () => {
    if (!confirm('คุณต้องการลบไฟล์แนบต้นฉบับนี้ใช่หรือไม่?')) return;
    setUploadingAttachment(true);
    try {
      const targetRev = document?.revisions?.find((r: any) => r.id === selectedRevisionId) || document?.revisions?.[0];
      const saveRes = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revisionId: targetRev?.id,
          attachmentUrl: null,
          attachmentName: null,
          attachmentSize: null,
        }),
      });
      if (saveRes.ok) {
        await fetchDocument();
      } else {
        alert('ไม่สามารถลบไฟล์แนบได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการลบไฟล์แนบ');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const fetchDocument = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDocument(data.document);
        // Default to latest revision
        if (data.document?.revisions?.length > 0) {
          setSelectedRevisionId(data.document.revisions[0].id);
        }
      } else {
        alert('ไม่พบเอกสารนี้');
        router.push('/documents');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user && id) fetchDocument();
  }, [user, loading, id]);

  const handleDuplicate = async () => {
    if (!confirm(`คุณต้องการทำสำเนาเอกสาร ${document?.documentNumber} เป็นเอกสารฉบับใหม่ใช่หรือไม่?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/documents/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`ทำสำเนาเรียบร้อย ได้รับเลขที่เอกสารใหม่: ${data.document.documentNumber}`);
        router.push(`/documents/${data.document.id}`);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการทำสำเนา');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!document) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          expectedVersion: document.version,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDocument((prev: any) => ({ ...prev, status: newStatus, version: prev.version + 1 }));
      } else if (res.status === 409) {
        alert(data.message || 'ข้อมูลขัดแย้งกับผู้ใช้อื่น กรุณารีเฟรช');
        fetchDocument();
      } else {
        alert(data.error || 'ไม่สามารถเปลี่ยนสถานะได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading || fetching || !document) {
    return <div className="p-12 text-center text-slate-400">กำลังโหลดเอกสาร...</div>;
  }

  // Active revision object
  const activeRev =
    document.revisions?.find((r: any) => r.id === selectedRevisionId) ||
    document.revisions?.[0];

  const isViewingLatest = activeRev?.isLatest ?? true;

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header
        title={`${document.documentNumber} - ${document.title}`}
        subtitle={`${document.documentType === 'QUOTATION' ? 'ใบเสนอราคา' : 'BOQ'} | สร้างเมื่อ ${new Date(
          document.createdAt
        ).toLocaleDateString('th-TH')}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Selector */}
            <select
              value={document.status}
              disabled={statusUpdating}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-800"
            >
              <option value="DRAFT">ร่างเอกสาร (Draft)</option>
              <option value="IN_PROGRESS">กำลังจัดทำ (In Progress)</option>
              <option value="PENDING_REVIEW">รอตรวจสอบ (Review)</option>
              <option value="APPROVED">อนุมัติแล้ว (Approved)</option>
              <option value="SENT">ส่งลูกค้าแล้ว (Sent)</option>
              <option value="ACCEPTED">ลูกค้ารับราคา (Accepted)</option>
              <option value="REJECTED">ปฏิเสธ (Rejected)</option>
              <option value="CANCELLED">ยกเลิก (Cancelled)</option>
            </select>

            {/* Edit Button */}
            <Link
              href={`/documents/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            >
              <Edit3 className="w-4 h-4" />
              แก้ไขเอกสาร
            </Link>

            {/* Create Revision */}
            <Link
              href={`/documents/${id}/revisions/new`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs"
            >
              <GitBranch className="w-4 h-4" />
              สร้าง Revision ใหม่
            </Link>

            {/* Compare Revisions */}
            {(document.revisions || []).length > 1 && (
              <Link
                href={`/documents/${id}/compare?revA=${document.revisions[1].id}&revB=${document.revisions[0].id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300"
              >
                <History className="w-4 h-4 text-slate-500" />
                เปรียบเทียบ Revision
              </Link>
            )}

            {/* Print / PDF Actions */}
            {activeRev?.attachmentUrl ? (
              <>
                <a
                  href={activeRev.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                  title="เปิดดูและสั่งพิมพ์ไฟล์แนบต้นฉบับโดยตรง"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ / ดูไฟล์แนบต้นฉบับ ({activeRev.attachmentName ? (activeRev.attachmentName.length > 20 ? activeRev.attachmentName.slice(0, 18) + '...' : activeRev.attachmentName) : 'ไฟล์แนบ'})</span>
                </a>

                <Link
                  href={`/documents/${id}/print?revId=${activeRev?.id}&view=form`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300"
                  title="พิมพ์แบบฟอร์มใบเสนอราคาของระบบ"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>แบบฟอร์มระบบ</span>
                </Link>
              </>
            ) : (
              <Link
                href={`/documents/${id}/print?revId=${activeRev?.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
              >
                <Printer className="w-4 h-4" />
                พิมพ์ / ส่งออก PDF
              </Link>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Revision Switcher Banner */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              กำลังดูเวอร์ชัน:
            </span>
            <select
              value={selectedRevisionId}
              onChange={(e) => setSelectedRevisionId(e.target.value)}
              className="border-2 border-blue-600 rounded-lg px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-950 focus:outline-none"
            >
              {document.revisions?.map((rev: any) => (
                <option key={rev.id} value={rev.id}>
                  {rev.revisionCode} {rev.isLatest ? '(ฉบับล่าสุด)' : ''} - {rev.revisionReason} (฿
                  {rev.grandTotal?.toLocaleString('th-TH')})
                </option>
              ))}
            </select>

            <RevisionBadge code={activeRev?.revisionCode || 'Rev.00'} isLatest={isViewingLatest} />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              ผู้สร้าง Revision: <strong className="text-slate-800">{activeRev?.createdBy?.name}</strong>
            </span>
            <span>•</span>
            <span>
              วันที่จัดทำ: {new Date(activeRev?.documentDate).toLocaleDateString('th-TH')}
            </span>
          </div>
        </div>

        {/* Warning banner if looking at an older revision */}
        {!isViewingLatest && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                คุณกำลังเปิดดูข้อมูลย้อนหลังของ <strong>{activeRev?.revisionCode}</strong>{' '}
                (ข้อมูลถูกล็อคถาวร ยอดเงินและรายการจะไม่มีวันเปลี่ยนแปลง)
              </span>
            </div>
            <button
              onClick={() => setSelectedRevisionId(document.revisions[0].id)}
              className="font-bold underline text-blue-700 hover:text-blue-900"
            >
              กลับไปดูฉบับล่าสุด ({document.latestRevisionCode})
            </button>
          </div>
        )}

        {/* Info Header Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">ประเภทเอกสาร</span>
              <DocTypeBadge type={document.documentType} />
              <div className="mt-2 text-slate-500">
                สถานะ: <StatusBadge status={document.status} />
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">ลูกค้า / ผู้สั่งจ้าง</span>
              <div className="font-bold text-slate-800 text-sm">
                {document.customerName || document.customer?.name || '-'}
              </div>
              <div className="text-slate-500 mt-0.5">
                เลขประจำตัวผู้เสียภาษี: {document.customerTaxId || document.customer?.taxId || '-'}
              </div>
              <div className="text-slate-500 truncate mt-0.5">
                ที่อยู่: {document.customerAddress || document.customer?.address || '-'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">โครงการ & สถานที่</span>
              <div className="font-bold text-slate-800 text-sm">
                {document.project?.name || 'ไม่มีระบุโครงการ'}
              </div>
              <div className="text-slate-600 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {document.workingLocation || document.location?.name || '-'}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-semibold block mb-0.5">การทำงานร่วมกัน</span>
              <div className="text-slate-700">
                ผู้จัดทำ:{' '}
                <strong className="text-slate-900">{document.createdBy?.name}</strong>
              </div>
              <div className="text-slate-600 mt-0.5">
                แก้ไขล่าสุดโดย: {document.updatedBy?.name}
              </div>
              <div className="text-slate-400 mt-0.5">
                เวอร์ชันข้อมูล: v{document.version} (Optimistic Locking Protected)
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 flex items-center gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('boq')}
            className={`pb-3 transition relative flex items-center gap-1.5 ${
              activeTab === 'boq'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            ตารางรายการ BOQ และราคา
          </button>
          <button
            onClick={() => setActiveTab('revisions')}
            className={`pb-3 transition relative flex items-center gap-1.5 ${
              activeTab === 'revisions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            ประวัติ Revision ({document.revisions?.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 transition relative flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            บันทึก Audit Logs ({document.auditLogs?.length})
          </button>
        </div>

        {/* Tab 1: BOQ Items & Financial Summary */}
        {activeTab === 'boq' && (
          <div className="space-y-6">
            {/* Attachment Section (Method 1: Original BOQ / Contract / Reference File) */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border-2 border-blue-200/80 shadow-xs space-y-3 bg-gradient-to-r from-blue-50/50 via-white to-slate-50/40">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Paperclip className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      เอกสารแนบต้นฉบับ / สัญญาเดิม (PDF, Excel, ภาพสแกน)
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        เอกสารอ้างอิง
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      เอกสารต้นฉบับสัญญา หรือ BOQ เก่าที่นำเข้าบันทึกไว้ในระบบคู่กับ Revision นี้
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingAttachment
                        ? 'กำลังอัปโหลด...'
                        : activeRev?.attachmentUrl
                        ? 'เปลี่ยนไฟล์แนบ'
                        : '+ อัปโหลดไฟล์แนบต้นฉบับ'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.zip,.png,.jpg,.jpeg"
                      disabled={uploadingAttachment}
                      onChange={handleAttachmentUpload}
                      className="hidden"
                    />
                  </label>

                  {activeRev?.attachmentUrl && (
                    <button
                      type="button"
                      disabled={uploadingAttachment}
                      onClick={handleRemoveAttachment}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition"
                      title="ลบไฟล์แนบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบไฟล์</span>
                    </button>
                  )}
                </div>
              </div>

              {activeRev?.attachmentUrl ? (
                <>
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {activeRev.attachmentName || 'ไฟล์เอกสารต้นฉบับแนบ'}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        {activeRev.attachmentSize ? (
                          <span>
                            {activeRev.attachmentSize / 1024 > 1024
                              ? (activeRev.attachmentSize / (1024 * 1024)).toFixed(2) + ' MB'
                              : (activeRev.attachmentSize / 1024).toFixed(1) + ' KB'}
                          </span>
                        ) : null}
                        <span>• จัดเก็บในระบบเรียบร้อย</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={activeRev.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      เปิดดู / สั่งพิมพ์ไฟล์แนบ
                    </a>
                    <a
                      href={activeRev.attachmentUrl}
                      download={activeRev.attachmentName}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 text-xs font-semibold shadow-2xs transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      ดาวน์โหลด
                    </a>
                  </div>
                </div>

                {/* PDF Preview Inline */}
                {(activeRev.attachmentName?.toLowerCase().endsWith('.pdf') || activeRev.attachmentUrl.toLowerCase().includes('.pdf')) && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                    <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold">แสดงตัวอย่างเอกสารแนบต้นฉบับ ({activeRev.attachmentName})</span>
                      </div>
                      <a
                        href={activeRev.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-semibold"
                      >
                        <ExternalLink className="w-3 h-3" />
                        เปิดเต็มจอ
                      </a>
                    </div>
                    <iframe
                      src={activeRev.attachmentUrl}
                      className="w-full h-[650px] border-0"
                      title="Attached Original Document Preview"
                    />
                  </div>
                )}
              </>
              ) : (
                <div className="border border-dashed border-blue-200 rounded-xl p-4 bg-white/70 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Paperclip className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        ยังไม่มีไฟล์เอกสารต้นฉบับแนบใน Revision นี้ (Optional)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        สามารถแนบไฟล์สแกนสัญญาเก่า ใบเสนอราคาเดิม หรือเอกสารสเปกอ้างอิง (.pdf, .xlsx, .docx, รูปภาพ)
                      </div>
                    </div>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs transition">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>{uploadingAttachment ? 'กำลังอัปโหลด...' : '+ เลือกไฟล์จากเครื่อง'}</span>
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.zip,.png,.jpg,.jpeg"
                      disabled={uploadingAttachment}
                      onChange={handleAttachmentUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">
                  รายการงานในฉบับ {activeRev?.revisionCode} (เหตุผล: {activeRev?.revisionReason})
                </h3>
                <span className="text-xs text-slate-500">
                  หน่วยเงิน: บาท (THB)
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                      <th className="p-2.5 text-center w-12">ลำดับ</th>
                      <th className="p-2.5 text-left min-w-[220px]">รายการ / รายละเอียดงาน</th>
                      <th className="p-2.5 text-left min-w-[180px]">Specification / สเปค</th>
                      <th className="p-2.5 text-center w-16">หน่วย</th>
                      <th className="p-2.5 text-right w-16">จำนวน</th>
                      <th className="p-2.5 text-center bg-blue-50 border-l border-blue-200" colSpan={2}>
                        Material Charge (ค่าวัสดุ)
                      </th>
                      <th className="p-2.5 text-center bg-emerald-50 border-l border-emerald-200" colSpan={2}>
                        Labour Charge (ค่าแรง)
                      </th>
                      <th className="p-2.5 text-right w-28 border-l border-slate-200">Total (รวมเงิน)</th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200 text-[11px]">
                      <th colSpan={5}></th>
                      <th className="p-1.5 text-right w-24 bg-blue-50/50 border-l border-blue-200">ราคา/หน่วย</th>
                      <th className="p-1.5 text-right w-24 bg-blue-50/50">รวมค่าของ</th>
                      <th className="p-1.5 text-right w-24 bg-emerald-50/50 border-l border-emerald-200">ราคา/หน่วย</th>
                      <th className="p-1.5 text-right w-24 bg-emerald-50/50">รวมค่าแรง</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(activeRev?.categories || []).map((cat: any, cIdx: number) => (
                      <React.Fragment key={cat.id || cIdx}>
                        <tr className="bg-slate-100/80 font-bold text-slate-800 border-t border-b border-slate-200">
                          <td colSpan={9} className="p-2.5 pl-4">
                            {cat.name}
                          </td>
                          <td className="p-2.5 text-right font-mono text-blue-900">
                            ฿{cat.subtotal?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>

                        {(cat.items || []).map((it: any) => {
                          const matAmt = it.materialAmount !== undefined && it.materialAmount !== null
                            ? it.materialAmount
                            : ((it.quantity || 1) * (it.materialPrice || 0));
                          const labAmt = it.laborAmount !== undefined && it.laborAmount !== null
                            ? it.laborAmount
                            : ((it.quantity || 1) * (it.laborPrice || 0));

                          return (
                            <tr key={it.id} className="hover:bg-slate-50 transition">
                              <td className="p-2.5 text-center text-slate-400 font-mono">
                                {it.itemNo}
                              </td>
                              <td className="p-2.5 font-medium text-slate-900 whitespace-pre-wrap">
                                {it.description}
                              </td>
                              <td className="p-2.5 text-slate-600 whitespace-pre-wrap">
                                {it.specification || '-'}
                              </td>
                              <td className="p-2.5 text-center text-slate-600">{it.unit || 'JOB'}</td>
                              <td className="p-2.5 text-right font-mono text-slate-800">
                                {it.quantity}
                              </td>
                              {/* Material */}
                              <td className="p-2.5 text-right font-mono bg-blue-50/20 border-l border-blue-100 text-slate-700">
                                {it.materialPrice > 0 ? it.materialPrice.toLocaleString('th-TH') : '-'}
                              </td>
                              <td className="p-2.5 text-right font-mono bg-blue-50/20 text-slate-800">
                                {matAmt > 0 ? matAmt.toLocaleString('th-TH') : '-'}
                              </td>
                              {/* Labour */}
                              <td className="p-2.5 text-right font-mono bg-emerald-50/20 border-l border-emerald-100 text-slate-700">
                                {it.laborPrice > 0 ? it.laborPrice.toLocaleString('th-TH') : '-'}
                              </td>
                              <td className="p-2.5 text-right font-mono bg-emerald-50/20 text-slate-800">
                                {labAmt > 0 ? labAmt.toLocaleString('th-TH') : '-'}
                              </td>
                              {/* Total */}
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900 border-l border-slate-200">
                                ฿{it.amount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary & Commercial Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Terms */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                  เงื่อนไขและข้อกำหนด
                </h4>
                <div>
                  <span className="text-slate-400 font-semibold block">ระยะเวลาดำเนินงาน:</span>
                  <span className="text-slate-800 font-medium">
                    {activeRev?.executionDuration || 'ตามที่ตกลงในสัญญา'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">ระยะเวลารับประกัน:</span>
                  <span className="text-slate-800 font-medium">
                    {activeRev?.warrantyDuration || '1 ปี นับจากวันส่งมอบงาน'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">เงื่อนไขการชำระเงิน:</span>
                  <span className="text-slate-800 font-medium">
                    {activeRev?.paymentTerms || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">หมายเหตุ:</span>
                  <span className="text-slate-600">{activeRev?.notes || '-'}</span>
                </div>
              </div>

              {/* Calculations breakdown */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ค่าใช้จ่ายทั้งหมด (Subtotal):</span>
                  <span className="font-mono font-bold text-slate-800">
                    ฿{activeRev?.subtotal?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">
                    ค่าดำเนินการและผลกำไร ({activeRev?.overheadRate || 10}%):
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    ฿{(activeRev?.overheadAmount || 0)?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ราคารวมทั้งหมด (Total Before VAT):</span>
                  <span className="font-mono font-bold text-slate-800">
                    ฿{activeRev?.totalBeforeVat?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">ภาษีมูลค่าเพิ่ม VAT {activeRev?.vatRate}%:</span>
                  <span className="font-mono font-bold text-slate-800">
                    ฿{activeRev?.vatAmount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-t-2 border-slate-300 text-sm">
                  <span className="font-bold text-slate-900">รวมยอดเงินทั้งหมด (Grand Total):</span>
                  <span className="font-mono font-extrabold text-blue-900 text-base">
                    ฿{activeRev?.grandTotal?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-950 font-medium text-center">
                  ({activeRev?.thaiBahtText})
                </div>
              </div>
            </div>

            {/* Signature Boxes (Matching authentic print format) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  ผู้ลงนามในเอกสารและลายเซ็นดิจิทัล (Signatures)
                </h4>
                <Link
                  href={`/documents/${id}/edit`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>แก้ไขผู้ลงนาม/วันที่/ลายเซ็น</span>
                </Link>
              </div>

              <div className="border border-slate-800 grid grid-cols-1 md:grid-cols-3 text-center text-xs divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-white">
                {/* Col 1: ผู้ตกลงรับราคา */}
                <div className="p-4 flex flex-col justify-between min-h-[140px]">
                  <div className="font-bold text-slate-900">ผู้ตกลงรับราคา</div>
                  <div className="my-auto flex flex-col items-center justify-center">
                    {activeRev?.clientSignatureUrl ? (
                      <img
                        src={activeRev.clientSignatureUrl}
                        alt="Client Signature"
                        className="h-10 object-contain mb-1"
                      />
                    ) : activeRev?.clientSignerName ? (
                      <div className="font-bold text-slate-800 text-xs mb-1">{activeRev.clientSignerName}</div>
                    ) : null}
                    <div className="w-full border-b border-dashed border-slate-300 max-w-[170px] mt-1"></div>
                  </div>
                  <div className="mt-auto flex items-end justify-center gap-1.5 w-full max-w-[170px] mx-auto text-[11px] text-slate-700">
                    <span className="shrink-0 pb-0.5">วันที่</span>
                    <div className="flex-1 border-b border-dashed border-slate-300 relative flex items-center justify-center h-4">
                      {activeRev?.clientSignedDate ? (
                        <span className="font-mono text-xs text-slate-800 absolute bottom-0.5 text-center">
                          {new Date(activeRev.clientSignedDate).toLocaleDateString('th-TH')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Col 2: ผู้จัดทำและเสนอราคา */}
                <div className="p-4 flex flex-col justify-between min-h-[140px]">
                  <div className="font-bold text-slate-900">ผู้จัดทำและเสนอราคา</div>
                  <div className="my-auto flex flex-col items-center justify-center">
                    {activeRev?.preparedSignatureUrl ? (
                      <img
                        src={activeRev.preparedSignatureUrl}
                        alt="Prepared Signature"
                        className="h-10 object-contain mb-1"
                      />
                    ) : (
                      <div className="font-bold text-slate-900 text-xs mb-1">
                        {activeRev?.preparedBy || 'วรัญญา คำดำ'}
                      </div>
                    )}
                    <div className="w-full border-b border-dashed border-slate-300 max-w-[170px]"></div>
                  </div>
                  <div className="mt-auto flex items-end justify-center gap-1.5 w-full max-w-[170px] mx-auto text-[11px] text-slate-700">
                    <span className="shrink-0 pb-0.5">วันที่</span>
                    <div className="flex-1 border-b border-dashed border-slate-300 relative flex items-center justify-center h-4">
                      <span className="font-mono text-xs text-slate-800 absolute bottom-0.5 text-center">
                        {activeRev?.preparedDate
                          ? new Date(activeRev.preparedDate).toLocaleDateString('th-TH')
                          : new Date(activeRev?.documentDate || document.createdAt).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Col 3: บริษัท เทคนิคอล วอเตอร์ จำกัด */}
                <div className="p-4 flex flex-col justify-between min-h-[140px]">
                  <div className="font-bold text-slate-900">บริษัท เทคนิคอล วอเตอร์ จำกัด</div>
                  <div className="my-auto flex flex-col items-center justify-center">
                    {activeRev?.approvedSignatureUrl ? (
                      <img
                        src={activeRev.approvedSignatureUrl}
                        alt="Signature"
                        className="h-10 object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="h-10"></div>
                    )}
                    <div className="w-full border-b border-dashed border-slate-300 max-w-[170px] mt-0.5"></div>
                    <div className="font-bold text-slate-800 text-[11px] mt-1">
                      {activeRev?.approvedBy || 'ผู้มีอำนาจลงนาม / AUTHORIZED SIGNATURE'}
                    </div>
                  </div>
                  <div className="mt-auto flex items-end justify-center gap-1.5 w-full max-w-[170px] mx-auto text-[11px] text-slate-700">
                    <span className="shrink-0 pb-0.5">วันที่</span>
                    <div className="flex-1 border-b border-dashed border-slate-300 relative flex items-center justify-center h-4">
                      <span className="font-mono text-xs text-slate-800 absolute bottom-0.5 text-center">
                        {activeRev?.approvedDate
                          ? new Date(activeRev.approvedDate).toLocaleDateString('th-TH')
                          : new Date(activeRev?.documentDate || document.createdAt).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attached Photo Section (Site / Equipment Photo) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600" />
                    รูปภาพประกอบหน้างาน / อุปกรณ์
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    รูปภาพนี้จะไปแสดงผลที่ส่วนท้ายของใบเสนอราคาและเอกสาร PDF อัตโนมัติ
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingPhoto ? 'กำลังอัปโหลด...' : (activeRev?.sitePhotoUrl ? 'เปลี่ยนรูปภาพประกอบ' : '+ ใส่รูปภาพประกอบ')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingPhoto}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {activeRev?.sitePhotoUrl && (
                    <button
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold transition"
                      title="ลบรูปภาพประกอบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ลบรูป</span>
                    </button>
                  )}
                </div>
              </div>

              {activeRev?.sitePhotoUrl ? (
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="border-2 border-slate-700 p-1 bg-white shadow-sm inline-block rounded max-w-md">
                    <img
                      src={activeRev.sitePhotoUrl}
                      alt="รูปภาพประกอบหน้างาน / อุปกรณ์"
                      className="max-h-72 w-auto object-contain rounded"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2">
                    ตัวอย่างรูปภาพประกอบที่จะปรากฏในใบเสนอราคาฉบับพิมพ์
                  </span>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50">
                  <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-700">
                    ยังไม่มีรูปภาพประกอบสำหรับเอกสารนี้
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                    สามารถใส่รูปภาพหน้างาน อุปกรณ์ หรือรูปสถานที่ปฏิบัติงานเพื่อแนบท้ายใบเสนอราคาได้
                  </p>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingPhoto ? 'กำลังอัปโหลด...' : 'คลิกเพื่อเลือกไฟล์รูปภาพจากเครื่อง'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingPhoto}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Revision Timeline */}
        {activeTab === 'revisions' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  ประวัติการแก้ไขและเวอร์ชัน (Revision History)
                </h3>
                <p className="text-xs text-slate-500">
                  แต่ละ Revision ถูกจัดเก็บเป็นคนละชุดข้อมูลแบบถาวร ไม่มีการเขียนทับ
                </p>
              </div>

              <Link
                href={`/documents/${id}/revisions/new`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold"
              >
                <GitBranch className="w-3.5 h-3.5" />
                สร้าง Revision ใหม่
              </Link>
            </div>

            <div className="space-y-4">
              {document.revisions?.map((rev: any, idx: number) => (
                <div
                  key={rev.id}
                  className={`p-4 rounded-xl border transition ${
                    rev.id === selectedRevisionId
                      ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <RevisionBadge code={rev.revisionCode} isLatest={rev.isLatest} />
                      <span className="font-bold text-slate-900 text-sm">
                        {rev.revisionReason}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-900 text-sm">
                        ฿{rev.grandTotal?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedRevisionId(rev.id);
                          setActiveTab('boq');
                        }}
                        className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300"
                      >
                        เปิดดูฉบับนี้
                      </button>
                      <Link
                        href={`/documents/${id}/print?revId=${rev.id}`}
                        target="_blank"
                        className="p-1.5 rounded bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-300"
                        title="พิมพ์ PDF ฉบับนี้"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div>
                      ผู้จัดทำ Rev: <strong className="text-slate-700">{rev.createdBy?.name}</strong>
                    </div>
                    <div>
                      วันที่:{' '}
                      {new Date(rev.createdAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div>
                      ส่วนลด:{' '}
                      {rev.discountAmount > 0
                        ? `฿${rev.discountAmount?.toLocaleString('th-TH')}`
                        : 'ไม่มี'}
                    </div>
                    <div>VAT: {rev.vatRate}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
              บันทึกประวัติการกระทำ (Audit Trail)
            </h3>

            <div className="space-y-3">
              {document.auditLogs?.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">ยังไม่มีบันทึก</div>
              ) : (
                document.auditLogs?.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between text-xs gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {log.user?.name || 'ผู้ใช้'}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1">{log.details}</p>
                    </div>

                    <div className="text-slate-400 text-[11px] shrink-0">
                      {new Date(log.createdAt).toLocaleString('th-TH')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
