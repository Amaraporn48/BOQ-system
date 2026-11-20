'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { StatusBadge, DocTypeBadge, RevisionBadge } from '@/components/StatusBadge';
import { parseSitePhotos, serializeSitePhotos } from '@/lib/photoUtils';
import QuotationPaper from '@/components/QuotationPaper';
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
  Plus,
} from 'lucide-react';

export default function DocumentDetailPage() {
  const { id } = useParams() as { id: string };
  const { user, loading } = useAuth();
  const router = useRouter();

  const [document, setDocument] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'boq' | 'attachment' | 'revisions' | 'audit'>('boq');
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Status Change Dropdown
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showSystemDetails, setShowSystemDetails] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (file.size > 4 * 1024 * 1024) {
        alert(`ไฟล์รูปภาพ "${file.name}" มีขนาดเกิน 4 MB กรุณาเลือกรูปภาพขนาดไม่เกิน 4 MB`);
        e.target.value = '';
        return;
      }
    }

    setUploadingPhoto(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.status === 413) {
          alert(`ไฟล์ "${file.name}" มีขนาดใหญ่เกินกว่าที่เซิร์ฟเวอร์รองรับ (ไม่เกิน 4 MB)`);
          continue;
        }
        const data = await res.json();
        if (res.ok && data.url) {
          uploadedUrls.push(data.url);
        } else {
          alert(data.error || `อัปโหลดรูปภาพ "${file.name}" ไม่สำเร็จ`);
        }
      }

      if (uploadedUrls.length > 0) {
        const targetRev = document?.revisions?.find((r: any) => r.id === selectedRevisionId) || document?.revisions?.[0];
        const existingPhotos = parseSitePhotos(targetRev?.sitePhotoUrl);
        const combined = [...existingPhotos, ...uploadedUrls];

        const serialized = serializeSitePhotos(combined);

        // Optimistically update document in memory so scroll position never jumps!
        setDocument((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            revisions: (prev.revisions || []).map((r: any) =>
              r.id === targetRev?.id ? { ...r, sitePhotoUrl: serialized } : r
            ),
          };
        });

        const saveRes = await fetch(`/api/documents/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            revisionId: targetRev?.id,
            sitePhotoUrl: serialized,
          }),
        });
        if (saveRes.ok) {
          await fetchDocument(false); // Silent background refresh
        } else {
          alert('ไม่สามารถบันทึกรูปภาพลงเอกสารได้');
          await fetchDocument(false);
        }
      } else {
        alert('อัปโหลดรูปภาพล้มเหลว');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemoveSpecificPhoto = async (indexToRemove: number) => {
    if (!confirm('คุณต้องการลบรูปภาพประกอบนี้ใช่หรือไม่?')) return;
    setUploadingPhoto(true);
    try {
      const targetRev = document?.revisions?.find((r: any) => r.id === selectedRevisionId) || document?.revisions?.[0];
      const existingPhotos = parseSitePhotos(targetRev?.sitePhotoUrl);
      const remaining = existingPhotos.filter((_, idx) => idx !== indexToRemove);
      const serialized = serializeSitePhotos(remaining);

      // Optimistically update in memory
      setDocument((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          revisions: (prev.revisions || []).map((r: any) =>
            r.id === targetRev?.id ? { ...r, sitePhotoUrl: serialized } : r
          ),
        };
      });

      const saveRes = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revisionId: targetRev?.id,
          sitePhotoUrl: serialized,
        }),
      });
      if (saveRes.ok) {
        await fetchDocument(false);
      } else {
        alert('ไม่สามารถลบรูปภาพได้');
        await fetchDocument(false);
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการลบรูปภาพ');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('คุณต้องการลบรูปภาพประกอบทั้งหมดใช่หรือไม่?')) return;
    setUploadingPhoto(true);
    try {
      const targetRev = document?.revisions?.find((r: any) => r.id === selectedRevisionId) || document?.revisions?.[0];

      // Optimistically update in memory
      setDocument((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          revisions: (prev.revisions || []).map((r: any) =>
            r.id === targetRev?.id ? { ...r, sitePhotoUrl: null } : r
          ),
        };
      });

      const saveRes = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revisionId: targetRev?.id,
          sitePhotoUrl: null,
        }),
      });
      if (saveRes.ok) {
        await fetchDocument(false);
      } else {
        alert('ไม่สามารถลบรูปภาพได้');
        await fetchDocument(false);
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

    if (file.size > 4 * 1024 * 1024) {
      alert(`ไฟล์ "${file.name}" มีขนาดเกิน 4 MB กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 4 MB`);
      e.target.value = '';
      return;
    }

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.status === 413) {
        alert('ไฟล์มีขนาดใหญ่เกินกว่าที่เซิร์ฟเวอร์รองรับ (ขนาดสูงสุดไม่เกิน 4 MB)');
        return;
      }
      const data = await res.json();
      if (res.ok && data.url) {
        const targetRev = document?.revisions?.find((r: any) => r.id === selectedRevisionId) || document?.revisions?.[0];

        // Optimistically update attachment
        setDocument((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            revisions: (prev.revisions || []).map((r: any) =>
              r.id === targetRev?.id
                ? {
                    ...r,
                    attachmentUrl: data.url,
                    attachmentName: data.name || file.name,
                    attachmentSize: data.size || file.size,
                  }
                : r
            ),
          };
        });

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
          await fetchDocument(false);
        } else {
          alert('ไม่สามารถบันทึกไฟล์แนบลงเอกสารได้');
          await fetchDocument(false);
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

      // Optimistically update attachment
      setDocument((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          revisions: (prev.revisions || []).map((r: any) =>
            r.id === targetRev?.id
              ? {
                  ...r,
                  attachmentUrl: null,
                  attachmentName: null,
                  attachmentSize: null,
                }
              : r
          ),
        };
      });

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
        await fetchDocument(false);
      } else {
        alert('ไม่สามารถลบไฟล์แนบได้');
        await fetchDocument(false);
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการลบไฟล์แนบ');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const fetchDocument = async (showLoading = false) => {
    if (showLoading) setFetching(true);
    try {
      const [res, settsRes] = await Promise.all([
        fetch(`/api/documents/${id}`),
        fetch('/api/settings').catch(() => null),
      ]);
      if (res.ok) {
        const data = await res.json();
        setDocument(data.document);
        // Preserve current selected revision if valid
        setSelectedRevisionId((prevId) => {
          if (prevId && data.document?.revisions?.some((r: any) => r.id === prevId)) {
            return prevId;
          }
          return data.document?.revisions?.[0]?.id || '';
        });
      } else {
        alert('ไม่พบเอกสารนี้');
        router.push('/documents');
      }
      if (settsRes && settsRes.ok) {
        const settsData = await settsRes.json();
        setSettings(settsData.settings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setFetching(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user && id) fetchDocument(true);
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

  const handleApproveDocument = async () => {
    if (!document) return;
    if (!confirm(`คุณต้องการอนุมัติเอกสาร "${document.documentNumber}" ใช่หรือไม่?\n(เมื่ออนุมัติแล้ว เอกสารจะถูกจัดเก็บในแท็บ "อนุมัติแล้ว")`)) return;
    
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'APPROVED',
          expectedVersion: document.version,
          approvedBy: user?.name || activeRev?.approvedBy || undefined,
          approvedDate: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDocument((prev: any) => ({ ...prev, status: 'APPROVED', version: prev.version + 1 }));
        alert(`อนุมัติเอกสาร ${document.documentNumber} เรียบร้อยแล้ว`);
      } else if (res.status === 409) {
        alert(data.message || 'ข้อมูลขัดแย้งกับผู้ใช้อื่น กรุณารีเฟรช');
        fetchDocument();
      } else {
        alert(data.error || 'ไม่สามารถอนุมัติเอกสารได้');
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

  const hasCustomItems = (activeRev?.categories || []).some((c: any) =>
    (c.items || []).some((it: any) =>
      Boolean(it.description && it.description !== '-' && it.description !== 'หมวดที่ 1' && it.description.trim() !== '') ||
      (Number(it.materialPrice) || 0) > 0 ||
      (Number(it.laborPrice) || 0) > 0 ||
      (Number(it.amount) || 0) > 0
    )
  );
  const isAttachmentOnly = Boolean(activeRev?.attachmentUrl && !hasCustomItems);

  const isPdf = Boolean(
    activeRev?.attachmentName?.toLowerCase().endsWith('.pdf') ||
    activeRev?.attachmentUrl?.toLowerCase().includes('.pdf')
  );
  const isImage = Boolean(
    /\.(jpg|jpeg|png|webp|svg)$/i.test(activeRev?.attachmentName || activeRev?.attachmentUrl || '')
  );

  return (
    <div className="flex-1 flex flex-col pb-20">
      <Header
        title={`${document.documentNumber} - ${document.title}`}
        subtitle={`${document.documentType === 'QUOTATION' ? 'ใบเสนอราคา' : 'BOQ'} | สร้างเมื่อ ${new Date(
          document.createdAt
        ).toLocaleDateString('th-TH')}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Workflow Action Buttons */}
            {(document.status === 'IN_PROGRESS' || document.status === 'DRAFT') && (
              <>
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => handleStatusChange('PENDING_REVIEW')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                  title="ส่งรออนุมัติ (พร้อมตรวจ)"
                >
                  <span>📨</span>
                  <span>ส่งรออนุมัติ</span>
                </button>
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={handleApproveDocument}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                  title="อนุมัติทันที"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>อนุมัติทันที</span>
                </button>
              </>
            )}

            {document.status === 'PENDING_REVIEW' && (
              <>
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 shadow-xs transition disabled:opacity-50"
                  title="ส่งกลับไปให้ผู้จัดทำแก้ไขเพิ่มเติม"
                >
                  <span>↩️</span>
                  <span>ส่งกลับไปแก้ไข</span>
                </button>
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={handleApproveDocument}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                  title="อนุมัติเอกสารนี้"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>อนุมัติเอกสาร</span>
                </button>
              </>
            )}

            {document.status === 'APPROVED' && (
              <>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>อนุมัติแล้ว</span>
                </span>
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium border border-slate-300 transition disabled:opacity-50"
                  title="ย้อนสถานะกลับเป็นกำลังจัดทำ"
                >
                  <span>↩️</span>
                  <span>ย้อนกลับไปแก้ไข</span>
                </button>
              </>
            )}

            {/* Edit Button (Auto-Revision) */}
            <Link
              href={`/documents/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            >
              <Edit3 className="w-4 h-4" />
              แก้ไขเอกสาร (รัน Rev ใหม่)
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
            {isAttachmentOnly ? (
              <Link
                href={`/documents/${id}/print?revId=${activeRev?.id}&view=attachment`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                title="เปิดดูและสั่งพิมพ์ไฟล์แนบต้นฉบับ"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ / ดูไฟล์แนบต้นฉบับ ({activeRev?.attachmentName ? (activeRev.attachmentName.length > 20 ? activeRev.attachmentName.slice(0, 18) + '...' : activeRev.attachmentName) : 'ไฟล์แนบ'})</span>
              </Link>
            ) : (
              <Link
                href={`/documents/${id}/print?revId=${activeRev?.id}&view=form`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ / ส่งออก PDF</span>
              </Link>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Revision Switcher & Quick Navigation Bar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
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

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 ml-2 border-l border-slate-200 pl-3">
              <span>
                ผู้สร้าง: <strong className="text-slate-800">{activeRev?.createdBy?.name}</strong>
              </span>
              <span>•</span>
              <span>
                {new Date(activeRev?.documentDate).toLocaleDateString('th-TH')}
              </span>
            </div>
          </div>

          {/* Clean Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            {activeRev?.attachmentUrl && (
              <button
                onClick={() => setActiveTab('attachment')}
                className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                  activeTab === 'attachment' || (isAttachmentOnly && activeTab === 'boq')
                    ? 'bg-white text-emerald-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>📄 ไฟล์แนบต้นฉบับ</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('boq')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'boq' && (!isAttachmentOnly || !activeRev?.attachmentUrl)
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isAttachmentOnly ? 'หน้าฟอร์มใบเสนอราคา (ว่าง)' : 'หน้าฟอร์มใบเสนอราคา'}</span>
            </button>
            <button
              onClick={() => setActiveTab('revisions')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'revisions'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>ประวัติ Revision ({document.revisions?.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Audit Logs ({document.auditLogs?.length})</span>
            </button>
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

        {/* Tab: Attachment View (when clicked directly OR when document is attachment-only) */}
        {(activeTab === 'attachment' || (activeTab === 'boq' && isAttachmentOnly && activeRev?.attachmentUrl)) && (
          <div className="space-y-6">
            <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>{activeRev?.attachmentName || 'ไฟล์เอกสารแนบต้นฉบับ'}</span>
                      {activeRev?.attachmentSize ? (
                        <span className="text-[11px] font-normal text-slate-400">
                          ({Math.round(activeRev.attachmentSize / 1024)} KB)
                        </span>
                      ) : null}
                    </h3>
                    <p className="text-xs text-slate-400">เอกสารแนบต้นฉบับสัญญา / BOQ เดิมสำหรับโครงการนี้</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={activeRev?.attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดแท็บใหม่เต็มจอ</span>
                  </a>
                  <a
                    href={activeRev?.attachmentUrl}
                    download={activeRev?.attachmentName || 'attachment'}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดไฟล์</span>
                  </a>
                </div>
              </div>

              {isPdf ? (
                <div className="bg-slate-100 p-2">
                  <iframe
                    src={activeRev?.attachmentUrl}
                    className="w-full h-[85vh] min-h-[750px] border-0 rounded-lg bg-white"
                    title="Attached Document Preview"
                  />
                </div>
              ) : isImage ? (
                <div className="bg-slate-100 p-6 flex justify-center items-center min-h-[500px]">
                  <img
                    src={activeRev?.attachmentUrl}
                    alt="Attached Document"
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-md border border-slate-200 bg-white"
                  />
                </div>
              ) : (
                <div className="bg-white p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-800">{activeRev?.attachmentName}</h4>
                    <p className="text-xs text-slate-500 mt-1">ไฟล์แนบเป็นไฟล์เอกสารสำนักงาน (Excel / Word / CSV) ซึ่งเบราว์เซอร์ไม่สามารถพรีวิวในหน้าเว็บได้โดยตรง</p>
                  </div>
                  <div className="pt-2">
                    <a
                      href={activeRev?.attachmentUrl}
                      download={activeRev?.attachmentName || 'document'}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>ดาวน์โหลดไฟล์นี้เพื่อเปิดดู</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Attachment Management Bar at Bottom */}
            <div className="max-w-5xl mx-auto w-full flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200 text-xs shadow-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Paperclip className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-slate-800">จัดการไฟล์แนบ:</span>
                <span>{activeRev?.attachmentName}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingAttachment ? 'กำลังอัปโหลด...' : 'เปลี่ยนไฟล์แนบใหม่'}</span>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp"
                    disabled={uploadingAttachment}
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleRemoveAttachment}
                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                  title="ลบไฟล์แนบ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Attached Photo Section */}
            {parseSitePhotos(activeRev?.sitePhotoUrl).length > 0 && (
              <div className="max-w-5xl mx-auto w-full bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>ภาพถ่ายหน้างาน / อุปกรณ์ ({parseSitePhotos(activeRev?.sitePhotoUrl).length} รูป)</span>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>+ เพิ่มรูป</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploadingPhoto}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {parseSitePhotos(activeRev?.sitePhotoUrl).map((photoUrl: string, pIdx: number) => (
                    <div key={pIdx} className="relative group bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <img
                        src={photoUrl}
                        alt={`รูปภาพ ${pIdx + 1}`}
                        className="w-full h-24 object-contain rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecificPhoto(pIdx)}
                        className="absolute top-2 right-2 p-1 bg-white/90 hover:bg-rose-600 hover:text-white rounded text-rose-600 shadow-xs transition"
                        title="ลบรูปนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Form View (The Authentic Quotation / BOQ Sheet) */}
        {activeTab === 'boq' && (!isAttachmentOnly || !activeRev?.attachmentUrl) && (
          <div className="space-y-6">
            {activeRev?.attachmentUrl && (
              <div className="max-w-[210mm] mx-auto w-full bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-950 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    เอกสารนี้มีไฟล์แนบต้นฉบับ: <strong>{activeRev.attachmentName}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('attachment')}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>เปิดดูไฟล์แนบ</span>
                </button>
              </div>
            )}
                {/* The Quotation Paper Sheet! */}
                <QuotationPaper
                  document={document}
                  activeRev={activeRev}
                  company={settings}
                />

                {/* Subtle Attachment & Photo Management Bar at Bottom */}
                <div className="max-w-[210mm] mx-auto w-full flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200 text-xs shadow-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Paperclip className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-800">เอกสารแนบอ้างอิง:</span>
                    <span>
                      {activeRev?.attachmentName ? (
                        <strong className="text-slate-900">{activeRev.attachmentName}</strong>
                      ) : (
                        'ยังไม่มีไฟล์แนบเพิ่มเติมใน Revision นี้ (Optional)'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingAttachment ? 'กำลังอัปโหลด...' : '+ แนบไฟล์ต้นฉบับ/สัญญาเดิม'}</span>
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp"
                        disabled={uploadingAttachment}
                        onChange={handleAttachmentUpload}
                        className="hidden"
                      />
                    </label>
                    {activeRev?.attachmentUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                        title="ลบไฟล์แนบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Attached Photo Section (If photos exist, allow managing/adding) */}
                {parseSitePhotos(activeRev?.sitePhotoUrl).length > 0 && (
                  <div className="max-w-[210mm] mx-auto w-full bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <Camera className="w-4 h-4 text-blue-600" />
                        <span>ภาพถ่ายหน้างาน / อุปกรณ์ ({parseSitePhotos(activeRev?.sitePhotoUrl).length} รูป)</span>
                      </div>
                      <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition">
                        <Upload className="w-3 h-3" />
                        <span>+ เพิ่มรูป</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={uploadingPhoto}
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {parseSitePhotos(activeRev?.sitePhotoUrl).map((photoUrl: string, pIdx: number) => (
                        <div key={pIdx} className="relative group bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                          <img
                            src={photoUrl}
                            alt={`รูปภาพ ${pIdx + 1}`}
                            className="w-full h-24 object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecificPhoto(pIdx)}
                            className="absolute top-2 right-2 p-1 bg-white/90 hover:bg-rose-600 hover:text-white rounded text-rose-600 shadow-xs transition"
                            title="ลบรูปนี้"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                href={`/documents/${id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                <Edit3 className="w-3.5 h-3.5" />
                แก้ไขเพื่อรัน Revision ถัดไป
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
