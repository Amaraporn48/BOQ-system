'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { StatusBadge, RevisionBadge } from '@/components/StatusBadge';
import {
  FolderKanban,
  Building,
  MapPin,
  FileText,
  Plus,
  Eye,
  Calendar,
  Phone,
  User,
  ArrowLeft,
  Printer,
  DollarSign,
  Briefcase,
  CheckCircle,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string };
  const { user, loading } = useAuth();
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  // Edit Project Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    projectCode: '',
    name: '',
    customerId: '',
    workingLocation: '',
    coordinatorName: '',
    coordinatorPhone: '',
    status: 'Active',
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteProject = async () => {
    if (!project) return;
    if (project.documents && project.documents.length > 0) {
      alert(`ไม่สามารถลบโครงการนี้ได้ เนื่องจากมีเอกสารที่เกี่ยวข้องอยู่ ${project.documents.length} ฉบับ กรุณาลบหรือย้ายเอกสารก่อน`);
      return;
    }
    const confirmed = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโครงการ "${project.name}" (${project.projectCode})?\nการกระทำนี้ไม่สามารถย้อนกลับได้`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ลบโครงการไม่สำเร็จ');
      }
      alert('ลบโครงการเรียบร้อยแล้ว');
      router.push('/projects');
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบโครงการ');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenEdit = () => {
    setEditForm({
      projectCode: project.projectCode || '',
      name: project.name || '',
      customerId: project.customerId || '',
      workingLocation: project.workingLocation || '',
      coordinatorName: project.coordinatorName || '',
      coordinatorPhone: project.coordinatorPhone || '',
      status: project.status || 'Active',
    });
    if (customers.length === 0) {
      fetch('/api/customers')
        .then((r) => r.json())
        .then((d) => setCustomers(d.customers || []))
        .catch(() => {});
    }
    setShowEditModal(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      alert('กรุณากรอกชื่อโครงการ');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectCode: editForm.projectCode.trim() || undefined,
          name: editForm.name.trim(),
          customerId: editForm.customerId || null,
          workingLocation: editForm.workingLocation.trim() || null,
          coordinatorName: editForm.coordinatorName.trim() || null,
          coordinatorPhone: editForm.coordinatorPhone.trim() || null,
          status: editForm.status,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Refetch project to get full relations updated
        const updated = await fetch(`/api/projects/${id}`).then((r) => r.json());
        if (updated.project) {
          setProject(updated.project);
        }
        setShowEditModal(false);
      } else {
        alert(data.error || 'ไม่สามารถแก้ไขโครงการได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user && id) {
      fetch(`/api/projects/${id}`)
        .then((r) => r.json())
        .then((data) => setProject(data.project))
        .finally(() => setFetching(false));
    }
  }, [user, loading, id, router]);

  if (loading || fetching || !project) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs">กำลังโหลดข้อมูลโครงการ...</p>
        </div>
      </div>
    );
  }

  const documents = project.documents || [];
  const totalProjectValue = documents.reduce((sum: number, doc: any) => {
    const revTotal = doc.revisions?.[0]?.grandTotal || 0;
    return sum + Number(revTotal);
  }, 0);

  return (
    <div className="flex-1 flex flex-col pb-24 bg-slate-50/50 min-h-screen">
      <Header
        title={`โครงการ: ${project.name}`}
        subtitle={`รหัสโครงการ: ${project.projectCode || '-'} • โรงพยาบาล: ${project.customer?.name || '-'}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              กลับหน้ารวมโครงการ
            </Link>
            <button
              type="button"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500" />
              แก้ไขข้อมูลโครงการ
            </button>
            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                title="ลบโครงการ (เฉพาะ Admin)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                {deleting ? 'กำลังลบ...' : 'ลบโครงการ'}
              </button>
            )}
            <Link
              href={`/documents/new?projectId=${project.id}&type=BOQ`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              สร้าง BOQ ในโครงการนี้
            </Link>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Project Hero Card */}
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
                {project.projectCode || 'PJ-NO-CODE'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                สถานะ: {project.status}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">
                สร้างเมื่อ: {new Date(project.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition"
              >
                <Pencil className="w-3 h-3" />
                แก้ไข
              </button>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              ชื่อโครงการ
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              {project.name}
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-start gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <Building className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">โรงพยาบาล / ลูกค้า:</span>
                <span className="font-bold text-slate-900 text-sm block mt-0.5">{project.customer?.name || 'ไม่ระบุลูกค้า'}</span>
                {project.customer?.taxId && (
                  <span className="text-slate-500 block text-[11px] mt-0.5">เลขผู้เสียภาษี: {project.customer.taxId}</span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">สถานที่ปฏิบัติงาน:</span>
                <span className="font-semibold text-slate-900 text-sm block mt-0.5">{project.workingLocation || project.projectAddress || 'ไม่ได้ระบุ'}</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <User className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-500 block text-[11px] font-medium">ผู้ประสานงาน:</span>
                <span className="font-semibold text-slate-900 text-sm block mt-0.5">
                  {project.coordinatorName || '-'}{' '}
                  {project.coordinatorPhone ? `(โทร: ${project.coordinatorPhone})` : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Project KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                มูลค่างานรวมในโครงการ
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                ฿{totalProjectValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                คำนวณจากเอกสาร BOQ ทุกฉบับ
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                จำนวนใบ BOQ / งวดงาน
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {documents.length} <span className="text-sm font-normal text-slate-500">ฉบับ</span>
              </p>
              <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
                เอกสารที่สังกัดโครงการนี้
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                สถานะโครงการ
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {project.status || 'Active'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                สร้างเมื่อ {new Date(project.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Linked Documents Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              รายการเอกสาร BOQ ในโครงการนี้ ({documents.length} ฉบับ)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ใบเสนอราคาและแจกแจงปริมาณงานของโครงการ {project.name}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-3 whitespace-nowrap">เลขที่เอกสาร</th>
                  <th className="p-3 min-w-[220px]">ชื่องาน / รายละเอียดงวดงาน</th>
                  <th className="p-3 text-center whitespace-nowrap">Revision</th>
                  <th className="p-3 text-right whitespace-nowrap">ยอดรวมสุทธิ</th>
                  <th className="p-3 whitespace-nowrap">ผู้จัดทำ</th>
                  <th className="p-3 whitespace-nowrap">วันที่เอกสาร</th>
                  <th className="p-3 text-center whitespace-nowrap">สถานะ</th>
                  <th className="p-3 text-center whitespace-nowrap">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-3">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-600">ยังไม่มีเอกสาร BOQ ในโครงการนี้</p>
                        <p className="text-[11px] text-slate-400">คุณสามารถเริ่มต้นสร้างใบ BOQ ฉบับแรกสำหรับโครงการนี้ได้ทันที</p>
                        <Link
                          href={`/documents/new?projectId=${project.id}&type=BOQ`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                          สร้าง BOQ แรกสำหรับโครงการนี้
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  documents.map((doc: any) => {
                    const rev = doc.revisions?.[0];
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                          <Link href={`/documents/${doc.id}`} className="hover:underline hover:text-blue-600">
                            {doc.documentNumber}
                          </Link>
                        </td>
                        <td className="p-3">
                          <Link href={`/documents/${doc.id}`} className="font-semibold text-slate-800 hover:text-blue-600 line-clamp-1">
                            {doc.title}
                          </Link>
                          {doc.workingLocation && (
                            <div className="text-[11px] text-slate-400 truncate">
                              จุดทำงาน: {doc.workingLocation}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <RevisionBadge code={doc.latestRevisionCode || rev?.revisionCode || 'Rev.00'} isLatest={true} />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          ฿{Number(rev?.grandTotal || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{doc.createdBy?.name || '-'}</td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {new Date(rev?.documentDate || doc.createdAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/documents/${doc.id}`}
                              title="เปิดดูเอกสาร"
                              className="p-1.5 rounded hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/documents/${doc.id}/print`}
                              target="_blank"
                              title="พิมพ์ / ดู PDF"
                              className="p-1.5 rounded hover:bg-emerald-50 text-slate-600 hover:text-emerald-600"
                            >
                              <Printer className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                แก้ไขข้อมูลโครงการ
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    รหัสโครงการ
                  </label>
                  <input
                    type="text"
                    value={editForm.projectCode}
                    onChange={(e) => setEditForm({ ...editForm, projectCode: e.target.value })}
                    placeholder="เช่น PJ-PYT2-01"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-blue-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    สถานะโครงการ
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Active">Active (กำลังดำเนินการ)</option>
                    <option value="Completed">Completed (เสร็จสิ้น)</option>
                    <option value="On Hold">On Hold (พักโครงการ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อโครงการ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="เช่น งานติดตั้งระบบแจ้งเตือนอุณหภูมิตู้แช่ยา"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  โรงพยาบาล / ลูกค้า
                </label>
                <select
                  value={editForm.customerId}
                  onChange={(e) => setEditForm({ ...editForm, customerId: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- ไม่ระบุโรงพยาบาล / ลูกค้า --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  สถานที่ปฏิบัติงาน (จุดทำงานภายในโรงพยาบาล)
                </label>
                <input
                  type="text"
                  value={editForm.workingLocation}
                  onChange={(e) => setEditForm({ ...editForm, workingLocation: e.target.value })}
                  placeholder="เช่น แผนกคลังยา ชั้น 1 อาคาร PA"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ผู้ประสานงาน
                  </label>
                  <input
                    type="text"
                    value={editForm.coordinatorName}
                    onChange={(e) => setEditForm({ ...editForm, coordinatorName: e.target.value })}
                    placeholder="เช่น ผู้จัดการฝ่ายวิศวกรรม"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    value={editForm.coordinatorPhone}
                    onChange={(e) => setEditForm({ ...editForm, coordinatorPhone: e.target.value })}
                    placeholder="เช่น 088-287-8259"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs disabled:opacity-50 transition"
                >
                  {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
