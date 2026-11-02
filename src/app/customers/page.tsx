'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import {
  Building2,
  Search,
  Plus,
  Trash2,
  Edit2,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  FileSpreadsheet,
} from 'lucide-react';

export default function HospitalsAndCustomersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [customers, setCustomers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');

  // Quick Add Form
  const [quickName, setQuickName] = useState('');
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editTaxId, setEditTaxId] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const loadData = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user, search]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) {
      alert('กรุณากรอกชื่อโรงพยาบาล / ลูกค้า');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickName.trim(),
          taxId: taxId.trim() || null,
          address: address.trim() || null,
          contactPerson: contactPerson.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setQuickName('');
        setTaxId('');
        setAddress('');
        setContactPerson('');
        setPhone('');
        setEmail('');
        setNotes('');
        setShowMoreDetails(false);
        loadData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการเพิ่มรายชื่อโรงพยาบาล');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setAdding(false);
    }
  };

  const handleOpenEdit = (c: any) => {
    setEditId(c.id);
    setEditName(c.name || '');
    setEditTaxId(c.taxId || '');
    setEditAddress(c.address || '');
    setEditContactPerson(c.contactPerson || '');
    setEditPhone(c.phone || '');
    setEditEmail(c.email || '');
    setEditNotes(c.notes || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      alert('กรุณากรอกชื่อโรงพยาบาล / ลูกค้า');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          name: editName.trim(),
          taxId: editTaxId.trim() || null,
          address: editAddress.trim() || null,
          contactPerson: editContactPerson.trim() || null,
          phone: editPhone.trim() || null,
          email: editEmail.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowEditModal(false);
        loadData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (c: any) => {
    const docCount = c._count?.documents || 0;
    const warning = docCount > 0
      ? `\n\nคำเตือน: มีเอกสาร BOQ/ใบเสนอราคาที่เชื่อมโยงกับโรงพยาบาลนี้อยู่ ${docCount} ฉบับ (ระบบจะยกเลิกการผูก แต่ไม่ลบเอกสาร)`
      : '';

    if (!confirm(`คุณต้องการลบรายชื่อ "${c.name}" ใช่หรือไม่?${warning}`)) {
      return;
    }

    setDeletingId(c.id);
    try {
      const res = await fetch(`/api/customers?id=${encodeURIComponent(c.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        loadData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการลบรายชื่อ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading || !user) {
    return <div className="p-8 text-center text-slate-400">กำลังโหลด...</div>;
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <Header
        title="ระบบจัดการรายชื่อโรงพยาบาล (Hospital Management)"
        subtitle="เพิ่ม ลบ หรือแก้ไขรายชื่อโรงพยาบาลเพื่อใช้ในการจัดกลุ่มโครงการและออกเอกสาร BOQ / ใบเสนอราคา"
        actions={
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-800 rounded-lg border border-blue-200 text-xs font-semibold shadow-xs">
            <Building2 className="w-4 h-4 text-blue-600" />
            ทั้งหมด {customers.length} แห่ง
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Card Left: + เพิ่มโรงพยาบาลใหม่ */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                + เพิ่มโรงพยาบาลใหม่
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                ระบุชื่อโรงพยาบาลเพื่อบันทึกลงในฐานข้อมูล สำหรับดึงชื่อและที่อยู่อัตโนมัติในใบ BOQ
              </p>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-4">
              {/* Inline Add Box */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อโรงพยาบาล / ลูกค้า <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="พิมพ์ชื่อโรงพยาบาล เช่น โรงพยาบาลเพชรเวช"
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {adding ? 'กำลังเพิ่ม...' : '+ เพิ่มรายชื่อ'}
                  </button>
                </div>
              </div>

              {/* Collapsible Details */}
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMoreDetails(!showMoreDetails)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900 py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    ใส่ข้อมูลเพิ่มเติม (ที่อยู่, เลขผู้เสียภาษี, เบอร์โทร)
                  </span>
                  {showMoreDetails ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showMoreDetails && (
                  <div className="space-y-3 pt-3 mt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        เลขประจำตัวผู้เสียภาษี
                      </label>
                      <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="เช่น 0105548001122"
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        ที่อยู่โรงพยาบาล / สำนักงานใหญ่
                      </label>
                      <textarea
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="เลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          ผู้ติดต่อประสานงาน
                        </label>
                        <input
                          type="text"
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.target.value)}
                          placeholder="ชื่อผู้ติดต่อ..."
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          เบอร์โทรศัพท์
                        </label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="02-xxx-xxxx"
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        หมายเหตุ / บันทึกเพิ่มเติม
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="เช่น ประตูรับของด้านหลัง, แผนกวิศวกรรม"
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Card Right: รายการโรงพยาบาลในระบบ */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">รายการโรงพยาบาลในระบบ</h3>
                <p className="text-xs text-slate-500">
                  รายชื่อโรงพยาบาลทั้งหมดที่สามารถเลือกผูกกับโครงการและดึงข้อมูลใส่ BOQ ได้
                </p>
              </div>

              {/* Search bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อโรงพยาบาล..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {fetching ? (
              <div className="p-8 text-center text-slate-400 text-xs">กำลังโหลดข้อมูล...</div>
            ) : customers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Building2 className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                <p className="text-xs">ไม่พบรายชื่อโรงพยาบาลในระบบ</p>
                <p className="text-[11px] text-slate-400">
                  คุณสามารถเพิ่มรายชื่อใหม่ได้จากแบบฟอร์มด้านซ้าย
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/60 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-14 text-center">ลำดับ</th>
                      <th className="py-2.5 px-4">ชื่อโรงพยาบาล / ข้อมูลติดต่อ</th>
                      <th className="py-2.5 px-4 w-28 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {customers.map((c, index) => {
                      const docCount = c._count?.documents || 0;
                      const projCount = c._count?.projects || 0;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition group">
                          {/* Sequence Number */}
                          <td className="py-3 px-3 text-center text-slate-500 font-medium">
                            {index + 1}
                          </td>

                          {/* Hospital Info */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 group-hover:text-blue-700 transition">
                                  {c.name}
                                </span>
                                {docCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    <FileSpreadsheet className="w-2.5 h-2.5" />
                                    {docCount} เอกสาร
                                  </span>
                                )}
                                {projCount > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                    {projCount} โครงการ
                                  </span>
                                )}
                              </div>

                              {c.address && (
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 line-clamp-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  {c.address}
                                </p>
                              )}

                              <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                {c.taxId && <span>Tax ID: {c.taxId}</span>}
                                {c.phone && (
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="w-2.5 h-2.5" />
                                    {c.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center justify-center gap-1.5">
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(c)}
                                title="แก้ไขรายชื่อโรงพยาบาล"
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-600 transition shadow-2xs"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button (Circular Red matching image) */}
                              <button
                                type="button"
                                disabled={deletingId === c.id}
                                onClick={() => handleDelete(c)}
                                title="ลบรายชื่อ"
                                className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 transition inline-flex items-center justify-center shadow-2xs disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer / Hospital Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">แก้ไขข้อมูลโรงพยาบาล / ลูกค้า</h3>
                  <p className="text-[11px] text-slate-500">อัปเดตชื่อและที่อยู่สำหรับใช้ในเอกสาร</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อโรงพยาบาล / ลูกค้า <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="เช่น บริษัท โรงพยาบาลพญาไท 2 จำกัด"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลขประจำตัวผู้เสียภาษี
                </label>
                <input
                  type="text"
                  value={editTaxId}
                  onChange={(e) => setEditTaxId(e.target.value)}
                  placeholder="เช่น 0105548001122"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ที่อยู่โรงพยาบาล / สำนักงาน
                </label>
                <textarea
                  rows={2}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="ที่อยู่สำหรับออกใบเสนอราคาและ BOQ..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ผู้ติดต่อประสานงาน
                  </label>
                  <input
                    type="text"
                    value={editContactPerson}
                    onChange={(e) => setEditContactPerson(e.target.value)}
                    placeholder="เช่น ผู้จัดการฝ่ายวิศวกรรม"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="เช่น 02-617-2444"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุ / จุดติดตั้งหลัก
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="เช่น ประตูรับของด้านหลัง"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
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
