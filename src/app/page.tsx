'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { StatusBadge, DocTypeBadge, RevisionBadge } from '@/components/StatusBadge';
import { HorizontalScrollTable } from '@/components/HorizontalScrollTable';
import {
  FileText,
  Clock,
  CheckCircle,
  History,
  Plus,
  Search,
  FolderKanban,
  Copy,
  GitBranch,
  Printer,
  Eye,
  Filter,
  ArrowUpDown,
  Building,
  Building2,
  UserCheck,
  Calendar,
  MapPin,
  X,
  Trash2,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    totalProjects: 0,
    totalCustomers: 0,
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [staffFilter, setStaffFilter] = useState('');
  const [fetching, setFetching] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'me'>('all');
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState<'' | 'project' | 'general'>('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('');
  const [sortBy, setSortBy] = useState('documentNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Master lists
  const [yearsList, setYearsList] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);

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

  // Duplicate modal / action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const loc = p.get('location');
      if (loc) setSelectedLocation(loc);
      const yr = p.get('year');
      if (yr) setSelectedYear(yr);
    }
  }, []);

  const loadMasterFilters = async () => {
    try {
      const [yRes, lRes, cRes, pRes] = await Promise.all([
        fetch('/api/years').then((r) => r.json()),
        fetch('/api/locations').then((r) => r.json()),
        fetch('/api/customers').then((r) => r.json()),
        fetch('/api/projects').then((r) => r.json()),
      ]);
      setYearsList(yRes.years || []);
      setLocationsList(lRes.locations || []);
      setCustomersList(cRes.customers || []);
      setProjectsList(pRes.projects || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      loadMasterFilters();
    }
  }, [user]);

  const loadData = async () => {
    setFetching(true);
    try {
      // Load stats
      const statsRes = await fetch('/api/dashboard/stats');
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }

      // Load documents with current filters
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (docTypeFilter) params.set('type', docTypeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (selectedYear) params.set('year', selectedYear);
      if (selectedLocation) params.set('location', selectedLocation);
      if (jobTypeFilter) params.set('jobType', jobTypeFilter);
      if (selectedProjectFilter) params.set('projectId', selectedProjectFilter);
      if (staffFilter) {
        params.set('user', staffFilter);
      } else if (activeTab === 'me') {
        params.set('user', 'me');
      }
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);

      const docsRes = await fetch(`/api/documents?${params.toString()}`);
      if (docsRes.ok) {
        const data = await docsRes.json();
        let list = data.documents || [];
        setDocuments(list);
      }

      // If admin, load users list once for filtering
      if (user?.role === 'admin' && usersList.length === 0) {
        fetch('/api/users')
          .then((r) => r.json())
          .then((d) => setUsersList(d.users || []))
          .catch(() => {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, searchQuery, activeTab, docTypeFilter, statusFilter, staffFilter, selectedYear, selectedLocation, jobTypeFilter, selectedProjectFilter, sortBy, sortDir]);

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
        await loadMasterFilters();
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
        await loadMasterFilters();
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

  const handleDuplicate = async (docId: string, docNumber: string) => {
    if (!confirm(`คุณต้องการทำสำเนาเอกสาร ${docNumber} เป็นเอกสารฉบับใหม่ใช่หรือไม่?\n(ระบบจะสร้างเลขที่เอกสารใหม่ และไม่กระทบเอกสารเดิม)`)) {
      return;
    }

    setActionLoading(docId);
    try {
      const res = await fetch(`/api/documents/${docId}/duplicate`, {
        method: 'POST',
      });
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
      setActionLoading(null);
    }
  };

  const handleDeleteDocument = async (docId: string, docNumber: string) => {
    if (!confirm(`คุณต้องการลบเอกสาร "${docNumber}" ใช่หรือไม่?\n(เมื่อลบแล้ว เลขที่เอกสารนี้จะถูกคืนเข้าระบบและนำมารันต่อเนื่องได้)`)) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        loadData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการลบเอกสาร');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        กำลังโหลดระบบ...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="แดชบอร์ดระบบใบเสนอราคาและ BOQ"
        subtitle={`ยินดีต้อนรับ, ${user.name} | บริษัท เทคนิคอล วอเตอร์ จำกัด`}
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

      <div className="p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/documents"
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-blue-400 hover:shadow-md transition group"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                เอกสารทั้งหมด
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5 group-hover:underline flex items-center gap-1">
                Quotation &amp; BOQ ในระบบ &rarr;
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </Link>

          <Link
            href="/documents?tab=pending"
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-amber-400 hover:shadow-md transition group"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                รอการอนุมัติ (Pending)
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.inProgress}</p>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5 group-hover:underline flex items-center gap-1">
                คลิกดูเอกสารรออนุมัติ &rarr;
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </Link>

          <Link
            href="/documents?tab=approved"
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-emerald-400 hover:shadow-md transition group"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                อนุมัติแล้ว (Approved)
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5 group-hover:underline flex items-center gap-1">
                ฝ่ายบัญชี / พร้อมส่งลูกค้า &rarr;
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </Link>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          {/* Row 1: Quick Tabs & Document Count */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => {
                  setActiveTab('all');
                  setStaffFilter('');
                }}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === 'all' && !staffFilter
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เอกสารทั้งหมด ({stats.total})
              </button>
              <button
                onClick={() => {
                  setActiveTab('me');
                  setStaffFilter('');
                }}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeTab === 'me'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เอกสารที่ฉันสร้าง
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              แสดง <span className="font-bold text-slate-800">{documents.length}</span> จาก {stats.total} รายการ
            </div>
          </div>

          {/* Row 2: All Filters in ONE Single Clean Row */}
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
                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">ทุกปี</option>
                {yearsList.map((y) => (
                  <option key={y.year} value={String(y.year)}>
                    {y.label || `ปี ${y.buddhistYear || Number(y.year) + 543}`}
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

            {/* Location / Customer Filter with Quick Add & Link to /locations */}
            <div className="flex items-center gap-1">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 max-w-[155px] truncate hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">ทุกโรงพยาบาล / ลูกค้า</option>
                {customersList
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

            {/* If Admin: can filter by specific staff */}
            {user.role === 'admin' && usersList.length > 0 && (
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="text-xs border border-purple-300 rounded-lg px-2 py-1.5 bg-purple-50 text-purple-950 font-semibold hover:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer max-w-[140px] truncate"
              >
                <option value="">พนักงานทุกคน</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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

            {/* Clear Filter Button */}
            {(selectedYear || selectedLocation || staffFilter || statusFilter || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedYear('');
                  setSelectedLocation('');
                  setStaffFilter('');
                  setDocTypeFilter('');
                  setStatusFilter('');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                title="ล้างตัวกรองทั้งหมด"
              >
                <X className="w-3.5 h-3.5" />
                <span>ล้างตัวกรอง</span>
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเอกสาร: พิมพ์เลขที่เอกสาร, ชื่อโครงการ, ชื่อลูกค้า, หรือสถานที่ปฏิบัติงาน..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between rounded-t-xl">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              รายการเอกสารล่าสุด ({documents.length} ฉบับ)
            </h2>
            <div className="text-xs text-slate-500">
              คลิกที่หัวตารางเพื่อเรียงลำดับ
            </div>
          </div>

          <HorizontalScrollTable roundedTop={false}>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 select-none">
                  <th
                    onClick={() => toggleSort('documentNumber')}
                    className="p-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>เลขที่เอกสาร</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('title')}
                    className="p-3 cursor-pointer hover:bg-slate-100 min-w-[200px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>ชื่องาน</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3 min-w-[150px]">ลูกค้า</th>
                  <th className="p-3 min-w-[150px]">สถานที่</th>
                  <th className="p-3 text-center whitespace-nowrap">Revision ล่าสุด</th>
                  <th className="p-3 whitespace-nowrap">ผู้จัดทำ</th>
                  <th className="p-3 whitespace-nowrap">แก้ไขล่าสุดโดย</th>
                  <th
                    onClick={() => toggleSort('updatedAt')}
                    className="p-3 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>วันที่แก้ไข</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3 text-center whitespace-nowrap">สถานะ</th>
                  <th className="p-3 text-center whitespace-nowrap">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fetching ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      กำลังโหลดรายการเอกสาร...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400">
                      ไม่พบเอกสารตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const latestRev = (doc.revisions || [])[0] || {};
                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50 transition border-b border-slate-100"
                      >
                        <td className="p-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="hover:underline hover:text-blue-600"
                          >
                            {doc.documentNumber}
                          </Link>
                          {doc.copiedFromId && (
                            <div className="text-[10px] text-slate-400 font-sans font-normal">
                              สำเนา
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-semibold text-slate-800 hover:text-blue-600 line-clamp-2"
                          >
                            {doc.title}
                          </Link>
                        </td>

                        <td className="p-3 text-slate-700 truncate max-w-[150px]">
                          {doc.customerName || doc.customer?.name ? (
                            <button
                              type="button"
                              onClick={() => setSelectedLocation(doc.customerName || doc.customer?.name)}
                              title="คลิกเพื่อกรองเอกสารเฉพาะลูกค้านี้"
                              className="text-left text-slate-800 font-medium hover:text-blue-600 hover:underline truncate block"
                            >
                              {doc.customerName || doc.customer?.name}
                            </button>
                          ) : (
                            '-'
                          )}
                        </td>

                        <td className="p-3 text-slate-600 truncate max-w-[150px]">
                          {doc.workingLocation || doc.location?.name ? (
                            <button
                              type="button"
                              onClick={() => setSelectedLocation(doc.workingLocation || doc.location?.name)}
                              title="คลิกเพื่อกรองเอกสารเฉพาะสถานที่นี้"
                              className="text-left text-slate-700 hover:text-blue-600 hover:underline flex items-center gap-1 truncate"
                            >
                              <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                              <span className="truncate">{doc.workingLocation || doc.location?.name}</span>
                            </button>
                          ) : (
                            '-'
                          )}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          <Link
                            href={`/documents/${doc.id}/print${latestRev?.id ? `?revId=${latestRev.id}` : ''}`}
                            target="_blank"
                            title="คลิกเพื่อเปิดเอกสาร PDF เวอร์ชันล่าสุดโดยตรง"
                            className="group inline-flex flex-col items-center hover:opacity-80 transition cursor-pointer"
                          >
                            <RevisionBadge
                              code={doc.latestRevisionCode || 'Rev.00'}
                              isLatest={true}
                            />
                            <span className="text-[10px] text-blue-600 group-hover:underline flex items-center gap-0.5 mt-0.5 font-semibold">
                              📄 เปิด PDF
                            </span>
                          </Link>
                          {(doc.revisions || []).length > 1 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {(doc.revisions || []).length} เวอร์ชัน
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-slate-700 whitespace-nowrap">
                          {doc.createdBy?.name || '-'}
                        </td>

                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {doc.updatedBy?.name || '-'}
                        </td>

                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {new Date(doc.updatedAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="p-3 text-center whitespace-nowrap">
                          <StatusBadge status={doc.status} />
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* View Document */}
                            <Link
                              href={`/documents/${doc.id}`}
                              title="เปิดดูเอกสาร"
                              className="p-1.5 rounded hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {/* Create Revision */}
                            <Link
                              href={`/documents/${doc.id}/revisions/new`}
                              title="สร้าง Revision ใหม่"
                              className="p-1.5 rounded hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition"
                            >
                              <GitBranch className="w-4 h-4" />
                            </Link>

                            {/* Print / PDF */}
                            <Link
                              href={`/documents/${doc.id}/print`}
                              target="_blank"
                              title="พิมพ์ / ส่งออก PDF"
                              className="p-1.5 rounded hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition"
                            >
                              <Printer className="w-4 h-4" />
                            </Link>

                            {/* Delete Document */}
                            <button
                              type="button"
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
                  })
                )}
              </tbody>
            </table>
          </HorizontalScrollTable>
        </div>
      </div>

      {/* Modal: เพิ่มปีใหม่ (Quick Add Year) */}
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

      {/* Modal: เพิ่มสถานที่ใหม่ (Quick Add Location) */}
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
                  ที่อยู่สถานที่ (ไม่บังคับ)
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
