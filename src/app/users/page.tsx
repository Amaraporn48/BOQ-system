'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { UserCog, Plus, Shield, User, CheckCircle, XCircle, X, Edit2 } from 'lucide-react';

export default function UsersPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [saving, setSaving] = useState(false);

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('staff');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/login');
    }
  }, [user, loading, router]);

  const loadUsers = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) loadUsers();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !name) return;
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          name: name.trim(),
          email: email.trim(),
          role,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setUsername('');
        setPassword('');
        setName('');
        setEmail('');
        loadUsers();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการสร้างผู้ใช้งาน');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (targetUser: any) => {
    setEditId(targetUser.id);
    setEditName(targetUser.name || '');
    setEditUsername(targetUser.username || '');
    setEditEmail(targetUser.email || '');
    setEditPassword('');
    setEditRole(targetUser.role || 'staff');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editName.trim() || !editUsername.trim()) {
      alert('กรุณากรอกชื่อและชื่อผู้ใช้งาน (Username)');
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          name: editName.trim(),
          username: editUsername.trim(),
          email: editEmail.trim(),
          role: editRole,
          ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowEditModal(false);
        if (editId === user?.id) {
          refreshUser();
        }
        loadUsers();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setEditSaving(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`คุณต้องการ${currentStatus ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'} บัญชีนี้ใช่หรือไม่?`)) return;
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          isActive: !currentStatus,
        }),
      });
      if (res.ok) loadUsers();
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  if (loading || !user) return <div className="p-8 text-center text-slate-400">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="จัดการบัญชีผู้ใช้งาน (User Management)"
        subtitle="แก้ไขข้อมูลพนักงาน กำหนดสิทธิ์ Admin / Staff และจัดการสถานะการใช้งาน"
        actions={
          user?.role === 'admin' ? (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              เพิ่มบัญชีผู้ใช้ใหม่
            </button>
          ) : undefined
        }
      />

      <div className="p-6 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-3">ชื่อ-นามสกุล</th>
                <th className="p-3">ชื่อผู้ใช้งาน (Username)</th>
                <th className="p-3">อีเมล</th>
                <th className="p-3 text-center">สิทธิ์ (Role)</th>
                <th className="p-3 text-center">เอกสารที่สร้าง</th>
                <th className="p-3 text-center">สถานะ</th>
                <th className="p-3 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fetching ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    กำลังโหลดข้อมูลผู้ใช้...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-800">{u.name}</td>
                    <td className="p-3 font-mono text-slate-600">@{u.username}</td>
                    <td className="p-3 text-slate-500">{u.email}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-700">
                      {u._count?.createdDocuments || 0} ฉบับ
                    </td>
                    <td className="p-3 text-center">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          ใช้งานปกติ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 text-[11px] font-semibold">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          ถูกระงับ
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold border border-blue-300 text-blue-700 hover:bg-blue-50 inline-flex items-center gap-1 transition"
                          title="แก้ไขชื่อ, username หรือรหัสผ่าน"
                        >
                          <Edit2 className="w-3 h-3" />
                          แก้ไข
                        </button>
                        {user.role === 'admin' && u.id !== user.id && (
                          <button
                            onClick={() => toggleUserStatus(u.id, u.isActive)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition ${
                              u.isActive
                                ? 'text-rose-700 border-rose-300 hover:bg-rose-50'
                                : 'text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                            }`}
                          >
                            {u.isActive ? 'ระงับบัญชี' : 'เปิดใช้งาน'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <UserCog className="w-4 h-4 text-blue-600" />
                เพิ่มบัญชีผู้ใช้งานใหม่
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น นาย สมศักดิ์ ใจดี"
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อผู้ใช้งาน (Username) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="เช่น somsak_j"
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    รหัสผ่าน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="รหัสผ่านเริ่มต้น..."
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">อีเมล</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="somsak@siamengineering.co.th"
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">บทบาท (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 bg-white"
                >
                  <option value="staff">Staff (พนักงานทั่วไป - สร้างและแก้ไขเอกสาร)</option>
                  <option value="admin">Admin (ผู้ดูแลระบบ - จัดการสิทธิ์และการตั้งค่า)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'สร้างผู้ใช้'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-blue-600" />
                แก้ไขข้อมูลผู้ใช้งาน
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="เช่น นาย สมศักดิ์ ใจดี"
                  className="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อผู้ใช้งาน (Username) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-mono">@</span>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="somsak_j"
                    className="w-full border border-slate-300 rounded p-2 pl-7 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">ใช้สำหรับเข้าสู่ระบบ (ระบบจะตัดเครื่องหมาย @ ให้อัตโนมัติ)</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  รหัสผ่านใหม่ (Password)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน"
                  className="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">กรอกเฉพาะเมื่อต้องการเปลี่ยนรหัสผ่านใหม่เท่านั้น</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">อีเมล</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="somsak@siamengineering.co.th"
                  className="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">บทบาท (Role)</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={editId === user?.id}
                  className="w-full border border-slate-300 rounded p-2 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="staff">Staff (พนักงานทั่วไป - สร้างและแก้ไขเอกสาร)</option>
                  <option value="admin">Admin (ผู้ดูแลระบบ - จัดการสิทธิ์และการตั้งค่า)</option>
                </select>
                {editId === user?.id && (
                  <p className="text-[10px] text-slate-400 mt-0.5">ไม่สามารถเปลี่ยนสิทธิ์ของบัญชีตัวเองได้</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 transition"
                >
                  {editSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
