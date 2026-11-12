'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Copy,
  Download,
  Calendar,
  Layers,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Eye,
  FolderKanban,
  GitBranch,
  X,
  MapPin,
  Building2,
  Trash2,
  Edit2,
} from 'lucide-react';
import { StatusBadge, RevisionBadge, DocTypeBadge } from '@/components/StatusBadge';
import { HorizontalScrollTable } from '@/components/HorizontalScrollTable';

export default function DocumentsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-400">กำลังโหลด...</div>}>
      <DocumentsPageContent />
    </React.Suspense>
  );
}

function DocumentsPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  const [documents, setDocuments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [dbYears, setDbYears] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  // Workflow Tabs: 'all' | 'pending' | 'approved'
  const initialTab = searchParamsHook.get('tab');
  const [workflowTab, setWorkflowTab] = useState<'all' | 'pending' | 'approved'>(
    initialTab === 'pending' || initialTab === 'approved' ? initialTab : 'all'
  );

  useEffect(() => {
    const t = searchParamsHook.get('tab');
    if (t === 'pending' || t === 'approved') {
      setWorkflowTab(t);
    } else {
      setWorkflowTab('all');
    }
  }, [searchParamsHook]);

  const handleSelectWorkflowTab = (tab: 'all' | 'pending' | 'approved') => {
    setWorkflowTab(tab);
    const params = new URLSearchParams(searchParamsHook.toString());
    if (tab === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    router.replace(qs ? `/documents?${qs}` : '/documents', { scroll: false });
  };

  // Filters
  const [query, setQuery] = useState('');
  const [docType, setDocType] = useState('');
  const [status, setStatus] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'customer'>('none');

  // Quick Add Year Modal
  const [showYearModal, setShowYearModal] = useState(false);
  const [newYearInput, setNewYearInput] = useState('');
  const [newYearLabel, setNewYearLabel] = useState('');
  const [savingYear, setSavingYear] = useState(false);

  // Quick Add Location Modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocNotes, setNewLocNotes] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const loadMasterData = async () => {
    try {
      const [pRes, cRes, lRes, yRes] = await Promise.all([
        fetch('/api/projects').then((r) => r.json()),
        fetch('/api/customers').then((r) => r.json()),
        fetch('/api/locations').then((r) => r.json()),
        fetch('/api/years').then((r) => r.json()),
      ]);
      setProjects(pRes.projects || []);
      setCustomers(cRes.customers || []);
      setLocations(lRes.locations || []);
      setDbYears(yRes.years || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      loadMasterData();
    }
  }, [user]);

  const fetchDocuments = async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (docType) params.set('type', docType);
      if (status) params.set('status', status);
      if (selectedCustomerId) params.set('customerId', selectedCustomerId);
      if (selectedYear) params.set('year', selectedYear);
      if (selectedLocation) params.set('location', selectedLocation);

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user, query, docType, status, selectedCustomerId, selectedYear, selectedLocation]);

  const handleDuplicate = async (docId: string, docNumber: string) => {
    if (!confirm(`คุณต้องการทำสำเนาเอกสาร ${docNumber} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/documents/${docId}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`ทำสำเนาเรียบร้อย ได้รับเลขที่เอกสารใหม่: ${data.document.documentNumber}`);
        router.push(`/documents/${data.document.id}`);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการทำสำเนา');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleDeleteDocument = async (docId: string, docNumber: string) => {
    if (!confirm(`คุณต้องการลบเอกสาร "${docNumber}" ใช่หรือไม่?\n(เมื่อลบแล้ว เลขที่เอกสารนี้จะถูกคืนเข้าระบบและนำมารันต่อเนื่องได้)`)) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchDocuments();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการลบเอกสาร');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleQuickApprove = async (docId: string, docNumber: string) => {
    if (!confirm(`คุณต้องการอนุมัติเอกสาร "${docNumber}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      if (res.ok) {
        alert(`อนุมัติเอกสาร ${docNumber} เรียบร้อยแล้ว`);
        fetchDocuments();
      } else {
        alert('เกิดข้อผิดพลาดในการอนุมัติ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Add Year Handler
  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    let num = Number(newYearInput.trim());
    if (!num || isNaN(num)) {
      alert('กรุณากรอกปีเป็นตัวเลข เช่น 2025 หรือ 2568');
      return;
    }
    if (num > 2400) {
      num = num - 543;
    }
    setSavingYear(true);
    try {
      const res = await fetch('/api/years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: num,
          label: newYearLabel.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowYearModal(false);
        setNewYearInput('');
        setNewYearLabel('');
        await loadMasterData();
        setSelectedYear(String(num));
      } else {
        alert(data.error || 'ไม่สามารถเพิ่มปีได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingYear(false);
    }
  };

  // Add Location Handler
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) {
      alert('กรุณากรอกชื่อโรงพยาบาล / ลูกค้า');
      return;
    }
    setSavingLocation(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLocName.trim(),
          address: newLocAddress.trim() || null,
          notes: newLocNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const addedName = newLocName.trim();
        setShowLocationModal(false);
        setNewLocName('');
        setNewLocAddress('');
        setNewLocNotes('');
        await loadMasterData();
        setSelectedLocation(addedName);
      } else {
        alert(data.error || 'ไม่สามารถเพิ่มรายชื่อโรงพยาบาลได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingLocation(false);
    }
  };

  // Grouping helper
  const renderDocumentRow = (doc: any) => {
    const latestRev = (doc.revisions || [])[0] || {};
    return (
      <tr key={doc.id} className="hover:bg-slate-50 transition border-b border-slate-100">
        <td className="p-3 font-mono font-bold text-blue-900 whitespace-nowrap">
          <Link href={`/documents/${doc.id}`} className="hover:underline hover:text-blue-600">
            {doc.documentNumber}
          </Link>
          {doc.copiedFromId && (
            <div className="text-[10px] text-slate-400 font-sans font-normal">สำเนา</div>
          )}
        </td>
        <td className="p-3">
          <Link href={`/documents/${doc.id}`} className="font-semibold text-slate-800 hover:text-blue-600 line-clamp-2">
            {doc.title}
          </Link>
        </td>
        <td className="p-3 text-slate-700 truncate max-w-[150px]">
          {doc.customerName || doc.customer?.name || '-'}
        </td>
        <td className="p-3 text-slate-600 truncate max-w-[150px]">
          {doc.workingLocation || doc.location?.name || '-'}
        </td>
        <td className="p-3 text-center whitespace-nowrap">
          <Link
            href={`/documents/${doc.id}/print${latestRev?.id ? `?revId=${latestRev.id}` : ''}`}
            target="_blank"
            title="คลิกเพื่อเปิดเอกสาร PDF เวอร์ชันล่าสุดโดยตรง"
            className="group inline-flex flex-col items-center hover:opacity-80 transition cursor-pointer"
          >
            <RevisionBadge code={doc.latestRevisionCode || 'Rev.00'} isLatest={true} />
            <span className="text-[10px] text-blue-600 group-hover:underline flex items-center gap-0.5 mt-0.5 font-semibold">
              📄 เปิด PDF
            </span>
          </Link>
          {(doc.revisions || []).length > 1 && (
            <div className="text-[10px] text-slate-400 mt-0.5">{doc.revisions.length} เวอร์ชัน</div>
          )}
        </td>
        <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
          {typeof latestRev.grandTotal === 'number'
            ? `฿${latestRev.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`
            : '-'}
        </td>
        <td className="p-3 text-slate-700 whitespace-nowrap">{doc.createdBy?.name || '-'}</td>
        <td className="p-3 text-slate-500 whitespace-nowrap">
          {new Date(doc.updatedAt).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </td>
        <td className="p-3 text-center whitespace-nowrap">
          <StatusBadge status={doc.status} />
        </td>
        <td className="p-3 whitespace-nowrap text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Link
              href={`/documents/${doc.id}/print`}
              target="_blank"
              title="เปิดดู PDF เต็มหน้า"
              className="p-1.5 rounded hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 transition"
            >
              <Eye className="w-4 h-4" />
            </Link>
            <Link
              href={`/documents/${doc.id}/edit`}
              title="แก้ไขเอกสาร (ระบบจะรัน Revision ถัดไปให้อัตโนมัติ)"
              className="p-1.5 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition"
            >
              <Edit2 className="w-4 h-4" />
            </Link>
            {['PENDING_REVIEW', 'DRAFT', 'IN_PROGRESS'].includes(doc.status) && (
              <button
                type="button"
                onClick={() => handleQuickApprove(doc.id, doc.documentNumber)}
                title="กดอนุมัติเอกสารฉบับนี้ทันที"
                className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleDuplicate(doc.id, doc.documentNumber)}
              title="ทำสำเนาเอกสาร (Duplicate)"
              className="p-1.5 rounded hover:bg-amber-50 text-slate-600 hover:text-amber-600 transition"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteDocument(doc.id, doc.documentNumber)}
              title="ลบเอกสาร"
              className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const docYears = Array.from(
    new Set([
      String(new Date().getFullYear()),
      ...dbYears.map((y) => String(y.year)),
      ...documents
        .map((d) => {
          const y = new Date(d.createdAt).getFullYear();
          return y ? String(y) : null;
        })
        .filter(Boolean) as string[],
    ])
  ).sort((a, b) => b.localeCompare(a));

  const docLocations = Array.from(
    new Set([
      ...customers.map((c) => c.name?.trim()),
      ...locations.map((l) => l.name?.trim()),
      ...documents.map((d) => (d.customerName || d.customer?.name)?.trim()),
      ...documents.map((d) => d.workingLocation?.trim()),
    ].filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b, 'th'));

  // Workflow Tab Filtering
  const filteredDocuments = documents.filter((doc) => {
    if (workflowTab === 'pending') {
      return ['PENDING_REVIEW', 'DRAFT', 'IN_PROGRESS'].includes(doc.status);
    }
    if (workflowTab === 'approved') {
      return ['APPROVED', 'SENT', 'ACCEPTED'].includes(doc.status);
    }
    return true;
  });

  const pendingCount = documents.filter((d) => ['PENDING_REVIEW', 'DRAFT', 'IN_PROGRESS'].includes(d.status)).length;
  const approvedCount = documents.filter((d) => ['APPROVED', 'SENT', 'ACCEPTED'].includes(d.status)).length;

  const getGroupedData = () => {
    if (groupBy === 'none') return null;

    const groups: Record<string, any[]> = {};
    filteredDocuments.forEach((doc) => {
      const key = doc.customerName || doc.customer?.name || 'ไม่มีโรงพยาบาล/ลูกค้าระบุ';
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    });

    return groups;
  };

  const groupedData = getGroupedData();

  if (loading || !user) return <div className="p-8 text-center text-slate-400">กำลังโหลด...</div>;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="ระบบศูนย์กลางเอกสาร Quotation & BOQ"
        subtitle="ค้นหา ตรวจสอบ ทำสำเนา จัดการ Revision และส่งออก PDF"
        actions={
          <Link
            href="/documents/new?type=BOQ"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            สร้าง BOQ ใหม่
          </Link>
        }
      />

      <div className="p-6 space-y-4">
        {/* Workflow Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => handleSelectWorkflowTab('all')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition ${
              workflowTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📋 เอกสารทั้งหมด</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 font-semibold">
              {documents.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectWorkflowTab('pending')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition ${
              workflowTab === 'pending'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>⏳ รอการอนุมัติ (Pending)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] ${
                pendingCount > 0
                  ? 'bg-amber-100 text-amber-800 font-extrabold ring-1 ring-amber-300'
                  : 'bg-slate-100 text-slate-500 font-semibold'
              }`}
            >
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectWorkflowTab('approved')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition ${
              workflowTab === 'approved'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>✅ อนุมัติแล้ว (Approved / ฝ่ายบัญชี)</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800 font-semibold">
              {approvedCount}
            </span>
          </button>
        </div>

        {/* Filter controls */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา: เลขที่เอกสาร, ชื่อโครงการ, ลูกค้า, หรือสถานที่ปฏิบัติงาน..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <div className="flex items-center gap-1 text-slate-500 font-semibold shrink-0 pr-1 border-r border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>ตัวกรอง:</span>
              </div>

              {/* Year Filter with Quick Add */}
              <div className="flex items-center gap-1">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">ทุกปี</option>
                  {docYears.map((y) => (
                    <option key={y} value={y}>
                      ปี {Number(y) + 543}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowYearModal(true)}
                  title="เพิ่มปีใหม่"
                  className="p-1.5 border border-slate-300 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-400 text-slate-600 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Location Filter with Quick Add & Link to /locations */}
              <div className="flex items-center gap-1">
                <select
                  value={selectedLocation}
                  onChange={(e) => {
                    setSelectedLocation(e.target.value);
                    const matchedCust = customers.find((c) => c.name?.trim().toLowerCase() === e.target.value.trim().toLowerCase());
                    setSelectedCustomerId(matchedCust ? matchedCust.id : '');
                  }}
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white text-slate-700 max-w-[155px] truncate hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">ทุกโรงพยาบาล / ลูกค้า</option>
                  {customers
                    .map((c) => c.name?.trim())
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b, 'th'))
                    .map((cust) => (
                      <option key={`cust-${cust}`} value={cust}>
                        {cust}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  title="เพิ่มโรงพยาบาลใหม่"
                  className="p-1.5 border border-slate-300 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-400 text-slate-600 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">ทุกสถานะ</option>
                <option value="DRAFT">ร่างเอกสาร</option>
                <option value="IN_PROGRESS">กำลังจัดทำ</option>
                <option value="PENDING_REVIEW">รอตรวจสอบ</option>
                <option value="APPROVED">อนุมัติแล้ว</option>
                <option value="SENT">ส่งลูกค้าแล้ว</option>
                <option value="ACCEPTED">ลูกค้ารับราคา</option>
                <option value="CANCELLED">ยกเลิก</option>
              </select>

              {(selectedYear || selectedLocation || selectedCustomerId || docType || status || query) && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setDocType('');
                    setStatus('');
                    setSelectedCustomerId('');
                    setSelectedYear('');
                    setSelectedLocation('');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                  title="ล้างตัวกรองทั้งหมด"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>ล้างตัวกรอง</span>
                </button>
              )}
            </div>

            {/* Group By selector */}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>จัดกลุ่มตาม:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-700 font-medium cursor-pointer hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="none">ไม่จัดกลุ่ม (แสดงรายการทั้งหมด)</option>
                <option value="customer">จัดกลุ่มตาม: โรงพยาบาล / ลูกค้า</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table view */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <HorizontalScrollTable>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="p-3 whitespace-nowrap">เลขที่เอกสาร</th>
                  <th className="p-3 min-w-[200px]">ชื่องาน</th>
                  <th className="p-3 min-w-[150px]">ลูกค้า</th>
                  <th className="p-3 min-w-[150px]">สถานที่</th>
                  <th className="p-3 text-center whitespace-nowrap">Revision</th>
                  <th className="p-3 text-right whitespace-nowrap">ยอดรวมสุทธิ</th>
                  <th className="p-3 whitespace-nowrap">ผู้จัดทำ</th>
                  <th className="p-3 whitespace-nowrap">วันที่แก้ไข</th>
                  <th className="p-3 text-center whitespace-nowrap">สถานะ</th>
                  <th className="p-3 text-center whitespace-nowrap">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {fetching ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400">
                      {workflowTab === 'pending'
                        ? 'ไม่มีเอกสารที่รอการอนุมัติในขณะนี้'
                        : workflowTab === 'approved'
                        ? 'ยังไม่มีเอกสารที่ได้รับการอนุมัติ'
                        : 'ไม่พบเอกสารตามเงื่อนไขที่กำหนด'}
                    </td>
                  </tr>
                ) : groupedData ? (
                  Object.entries(groupedData).map(([groupTitle, docs]) => (
                    <React.Fragment key={groupTitle}>
                      <tr className="bg-slate-100 border-t-2 border-b border-slate-200">
                        <td colSpan={10} className="p-2.5 font-bold text-slate-800 text-xs">
                          {groupTitle} ({docs.length} ฉบับ)
                        </td>
                      </tr>
                      {docs.map(renderDocumentRow)}
                    </React.Fragment>
                  ))
                ) : (
                  filteredDocuments.map(renderDocumentRow)
                )}
              </tbody>
            </table>
          </HorizontalScrollTable>
        </div>
      </div>

      {/* Modal: Quick Add Year */}
      {showYearModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span>เพิ่มปีใหม่ (Add Year)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowYearModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddYear} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ระบุปี (ค.ศ. เช่น 2025 หรือ พ.ศ. เช่น 2568) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="เช่น 2025 หรือ 2568"
                  value={newYearInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewYearInput(val);
                    const n = Number(val);
                    if (n > 2400) {
                      setNewYearLabel(`ปี ${n - 543} (พ.ศ. ${n})`);
                    } else if (n > 1900) {
                      setNewYearLabel(`ปี ${n} (พ.ศ. ${n + 543})`);
                    }
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อแสดงผล
                </label>
                <input
                  type="text"
                  placeholder="เช่น ปี 2025 (พ.ศ. 2568)"
                  value={newYearLabel}
                  onChange={(e) => setNewYearLabel(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowYearModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingYear}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs disabled:opacity-50"
                >
                  {savingYear ? 'กำลังบันทึก...' : 'บันทึกปี'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Add Location */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>เพิ่มโรงพยาบาล / ลูกค้าใหม่ (Add Hospital)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLocation} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อโรงพยาบาล / ลูกค้า <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น โรงพยาบาลเพชรเวช หรือ บริษัท โรงพยาบาลกรุงเทพ จำกัด"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ที่อยู่ (ไม่บังคับ)
                </label>
                <textarea
                  rows={2}
                  placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด..."
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  หมายเหตุ (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  placeholder="เช่น จุดติดตั้งตู้แช่ยา, ประตูทางเข้า 3"
                  value={newLocNotes}
                  onChange={(e) => setNewLocNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingLocation}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs disabled:opacity-50"
                >
                  {savingLocation ? 'กำลังบันทึก...' : 'บันทึกสถานที่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
