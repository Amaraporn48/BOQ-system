'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { FolderKanban, Plus, Search, Building, MapPin, Eye, FileText, X, Filter, Calendar, Trash2 } from 'lucide-react';

export default function ProjectsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dbYears, setDbYears] = useState<any[]>([]);
  const [dbLocations, setDbLocations] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // New project modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [projectYear, setProjectYear] = useState(new Date().getFullYear().toString());
  const [workingLocation, setWorkingLocation] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

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

  const loadData = async () => {
    setFetching(true);
    try {
      const [projRes, custRes, yearsRes, locsRes] = await Promise.all([
        fetch(`/api/projects?q=${encodeURIComponent(search)}`),
        fetch('/api/customers'),
        fetch('/api/years'),
        fetch('/api/locations'),
      ]);
      const p = await projRes.json();
      const c = await custRes.json();
      const y = await yearsRes.json();
      const l = await locsRes.json();

      setProjects(p.projects || []);
      setCustomers(c.customers || []);
      setDbYears(y.years || []);
      setDbLocations(l.locations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          projectCode: projectCode.trim() || undefined,
          customerId: customerId || null,
          projectYear: projectYear ? Number(projectYear) : undefined,
          workingLocation: workingLocation.trim() || null,
          projectAddress: projectAddress.trim() || null,
          coordinatorName: coordinatorName.trim() || null,
          coordinatorPhone: coordinatorPhone.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setName('');
        setProjectCode('');
        setWorkingLocation('');
        loadData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการสร้างโครงการ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
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
        await loadData();
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

  // Add Hospital / Customer Handler
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
        await loadData();
        setSelectedLocation(addedName);
        if (showModal) {
          setWorkingLocation(addedName);
        }
      } else {
        alert(data.error || 'ไม่สามารถเพิ่มรายชื่อโรงพยาบาลได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingLocation(false);
    }
  };

  // Extract combined unique years
  const projectYearsFromItems = projects
    .map((p) => {
      if (p.projectYear) return String(p.projectYear);
      const y = new Date(p.createdAt).getFullYear();
      return y ? String(y) : null;
    })
    .filter(Boolean) as string[];

  const dbYearStrs = dbYears.map((y) => String(y.year));

  const years = Array.from(
    new Set([
      String(new Date().getFullYear()),
      ...dbYearStrs,
      ...projectYearsFromItems,
    ])
  ).sort((a, b) => b.localeCompare(a));

  // Extract unique hospital / customer names matching the "รายชื่อโรงพยาบาล / ลูกค้า" tab
  const locationsList = customers
    .map((c) => c.name?.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'th'));

  // Filter projects
  const filteredProjects = projects.filter((proj) => {
    if (selectedYear) {
      const pYear = proj.projectYear
        ? String(proj.projectYear)
        : new Date(proj.createdAt).getFullYear().toString();
      const codeMatch = proj.projectCode?.includes(selectedYear);
      const bYear2 = String(Number(selectedYear) + 543).slice(-2);
      const cYear2 = String(selectedYear).slice(-2);
      const shortCodeMatch = proj.projectCode?.includes(bYear2) || proj.projectCode?.includes(cYear2);
      if (pYear !== selectedYear && !codeMatch && !shortCodeMatch) return false;
    }
    if (selectedLocation) {
      const matchWorkingLoc = proj.workingLocation?.trim() === selectedLocation;
      const matchCustomer = proj.customer?.name?.trim() === selectedLocation;
      const partialMatch =
        (proj.workingLocation && proj.workingLocation.includes(selectedLocation)) ||
        (proj.customer?.name && proj.customer.name.includes(selectedLocation));
      if (!matchWorkingLoc && !matchCustomer && !partialMatch) return false;
    }
    if (selectedStatus) {
      if (proj.status !== selectedStatus) return false;
    }
    return true;
  });

  const handleDeleteProject = async (proj: any) => {
    if (proj._count?.documents > 0) {
      alert(`ไม่สามารถลบโครงการนี้ได้ เนื่องจากมีเอกสารที่เกี่ยวข้องอยู่ ${proj._count.documents} ฉบับ กรุณาลบหรือย้ายเอกสารก่อน`);
      return;
    }
    const confirmed = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโครงการ "${proj.name}" (${proj.projectCode})?\nการกระทำนี้ไม่สามารถย้อนกลับได้`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/projects/${proj.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ลบโครงการไม่สำเร็จ');
      alert('ลบโครงการเรียบร้อยแล้ว');
      loadData();
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบโครงการ');
    }
  };

  if (loading || !user) return <div className="p-8 text-center text-slate-400">กำลังโหลด...</div>;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="จัดการโครงการ (Projects)"
        subtitle="ศูนย์รวมโครงการและเอกสาร Quotation & BOQ ที่เกี่ยวข้องทั้งหมด"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            เพิ่มโครงการใหม่
          </button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา: รหัสโครงการ, ชื่อโครงการ, ลูกค้า..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Filter by Year with Quick Add */}
            <div className="md:col-span-3 flex items-center gap-1.5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    if (e.target.value === '__add_new_year__') {
                      setShowYearModal(true);
                    } else {
                      setSelectedYear(e.target.value);
                    }
                  }}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">ทุกปี (All Years)</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      ปี {y} (พ.ศ. {Number(y) + 543})
                    </option>
                  ))}
                  <option value="__add_new_year__" className="text-blue-600 font-semibold bg-blue-50">
                    + เพิ่มปีใหม่...
                  </option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowYearModal(true)}
                title="เพิ่มปีใหม่"
                className="p-2 border border-slate-300 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-400 text-slate-600 transition flex items-center gap-1 text-xs shrink-0 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">เพิ่มปี</span>
              </button>
            </div>

            {/* Filter by Location with Quick Add */}
            <div className="md:col-span-3 flex items-center gap-1.5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 truncate"
                >
                  <option value="">ทุกโรงพยาบาล / ลูกค้า (All Hospitals)</option>
                  {locationsList.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                title="เพิ่มโรงพยาบาลใหม่"
                className="p-2 border border-slate-300 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-400 text-slate-600 transition flex items-center gap-1 text-xs shrink-0 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">เพิ่มโรงพยาบาล</span>
              </button>
            </div>

            {/* Filter by Status */}
            <div className="md:col-span-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs md:text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">ทุกสถานะ (All Status)</option>
                <option value="Active">Active (กำลังดำเนินงาน)</option>
                <option value="Completed">Completed (เสร็จสิ้น)</option>
                <option value="On Hold">On Hold (ระงับชั่วคราว)</option>
              </select>
            </div>
          </div>

          {/* Active filter summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>ผลลัพธ์: <strong className="text-slate-900">{filteredProjects.length}</strong> จาก {projects.length} โครงการ</span>

              {(selectedYear || selectedLocation || selectedStatus || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setSelectedYear('');
                    setSelectedLocation('');
                    setSelectedStatus('');
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800 hover:underline font-semibold text-[11px]"
                >
                  ล้างตัวกรองทั้งหมด (Reset)
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <span>💡 สามารถกด <strong>+ เพิ่มปี</strong> หรือ <strong>+ เพิ่มสถานที่</strong> เพื่อกำหนดตัวกรองหรือใช้ในระบบได้เองทันที</span>
            </div>
          </div>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fetching ? (
            <div className="col-span-3 p-12 text-center text-slate-400">กำลังโหลดข้อมูล...</div>
          ) : filteredProjects.length === 0 ? (
            <div className="col-span-3 p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              ไม่พบโครงการตามตัวกรองที่เลือก
            </div>
          ) : (
            filteredProjects.map((proj) => (
              <Link
                key={proj.id}
                href={`/projects/${proj.id}`}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-500 hover:shadow-md transition flex flex-col justify-between group cursor-pointer text-left block"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-indigo-800 bg-indigo-50 group-hover:bg-indigo-100 px-2.5 py-0.5 rounded border border-indigo-200 transition">
                      {proj.projectCode}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        proj.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : proj.status === 'Completed'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {proj.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mb-2 line-clamp-2 group-hover:text-indigo-600 transition">
                    {proj.name}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{proj.customer?.name || 'ไม่ระบุลูกค้า'}</span>
                    </div>
                    {proj.workingLocation && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{proj.workingLocation}</span>
                      </div>
                    )}
                    {proj.coordinatorName && (
                      <div className="text-[11px] text-slate-500">
                        ผู้ประสานงาน: {proj.coordinatorName} {proj.coordinatorPhone ? `(${proj.coordinatorPhone})` : ''}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>{proj._count?.documents || 0} เอกสารในระบบ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteProject(proj);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 font-semibold px-2 py-1 rounded transition"
                        title="ลบโครงการ (เฉพาะ Admin)"
                      >
                        <Trash2 className="w-3 h-3" />
                        ลบ
                      </button>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-indigo-700 group-hover:text-indigo-900 bg-indigo-50 group-hover:bg-indigo-100 font-bold px-2.5 py-1 rounded-md transition">
                      <FolderKanban className="w-3.5 h-3.5 text-indigo-600" />
                      เข้าสู่หน้าโครงการ &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
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
                  ชื่อแสดงผล (ระบบสร้างให้อัตโนมัติหรือพิมพ์แก้ไขได้)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ปี 2025 (พ.ศ. 2568)"
                  value={newYearLabel}
                  onChange={(e) => setNewYearLabel(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-700 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-[11px] leading-relaxed">
                ℹ️ เมื่อบันทึกแล้ว ปีนี้จะปรากฏในตัวกรองปีและสามารถนำไปใช้ในโครงการหรือเอกสารได้ทันที
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
                <Building className="w-5 h-5 text-blue-600" />
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
                  placeholder="เช่น จุดรับของ หรือ แผนกที่ติดต่อ"
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

      {/* Modal: เพิ่มโครงการใหม่ */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">เพิ่มโครงการใหม่</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อโครงการ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น โครงการติดตั้งระบบไฟฟ้าสำรอง รพ.จุฬาลงกรณ์"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">รหัสโครงการ</label>
                  <input
                    type="text"
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value)}
                    placeholder="เว้นว่างเพื่อสร้างอัตโนมัติ"
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">ปีโครงการ</label>
                    <button
                      type="button"
                      onClick={() => setShowYearModal(true)}
                      className="text-blue-600 hover:underline font-semibold text-[10px]"
                    >
                      + เพิ่มปี
                    </button>
                  </div>
                  <select
                    value={projectYear}
                    onChange={(e) => setProjectYear(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-xs"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        ปี {y} (พ.ศ. {Number(y) + 543})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ลูกค้า / เจ้าของงาน</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white text-xs"
                >
                  <option value="">-- เลือกลูกค้า --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">สถานที่ปฏิบัติงาน</label>
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(true)}
                    className="text-blue-600 hover:underline font-semibold text-[10px]"
                  >
                    + เพิ่มสถานที่ใหม่
                  </button>
                </div>
                <div className="space-y-1.5">
                  <select
                    value={workingLocation}
                    onChange={(e) => setWorkingLocation(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-xs"
                  >
                    <option value="">-- เลือกจากสถานที่ที่มี หรือพิมพ์ระบุเองด้านล่าง --</option>
                    {locationsList.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={workingLocation}
                    onChange={(e) => setWorkingLocation(e.target.value)}
                    placeholder="หรือพิมพ์ระบุสถานที่เอง เช่น อาคารผู้ป่วยใน ชั้น 4"
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ผู้ประสานงาน</label>
                  <input
                    type="text"
                    value={coordinatorName}
                    onChange={(e) => setCoordinatorName(e.target.value)}
                    placeholder="ชื่อผู้ประสานงาน..."
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={coordinatorPhone}
                    onChange={(e) => setCoordinatorPhone(e.target.value)}
                    placeholder="เบอร์โทร..."
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="รายละเอียดหรือบันทึกภายใน..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'สร้างโครงการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
