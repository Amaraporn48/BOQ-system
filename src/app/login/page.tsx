'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Building2, Lock, User, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(username, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  const setTestAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and System Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white text-white shadow-xl mb-3 p-2">
            <img
              src="/tw-icon.png"
              alt="Technical Water Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">TECHNICAL WATER</h1>
          <p className="text-sm text-slate-400 mt-1">ระบบจัดทำใบเสนอราคาและ BOQ กลาง</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-1">เข้าสู่ระบบ (Sign In)</h2>
          <p className="text-xs text-slate-500 mb-6">
            เข้าสู่ระบบเพื่อจัดทำใบเสนอราคา BOQ และตรวจสอบเอกสารโครงการ
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="กรอกชื่อผู้ใช้..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-md transition disabled:opacity-50"
            >
              {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {/* Quick Demo Accounts for Testing & Evaluation */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              บัญชีทดสอบสำหรับจำลองการทำงานหลายคน:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTestAccount('admin', '1234')}
                className={`p-2 rounded-lg text-left border transition ${
                  username === 'admin'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">Admin (ผู้ดูแลระบบ)</div>
                <div className="text-[10px] text-slate-500">admin / 1234</div>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount('staff_a', 'staff1234')}
                className={`p-2 rounded-lg text-left border transition ${
                  username === 'staff_a'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">Staff A (สมศักดิ์)</div>
                <div className="text-[10px] text-slate-500">staff_a / staff1234</div>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount('staff_b', 'staff1234')}
                className={`p-2 rounded-lg text-left border transition ${
                  username === 'staff_b'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">Staff B (วิภาภรณ์)</div>
                <div className="text-[10px] text-slate-500">staff_b / staff1234</div>
              </button>

              <button
                type="button"
                onClick={() => setTestAccount('staff_c', 'staff1234')}
                className={`p-2 rounded-lg text-left border transition ${
                  username === 'staff_c'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 font-medium'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold">Staff C (ภานุมาศ)</div>
                <div className="text-[10px] text-slate-500">staff_c / staff1234</div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400 mt-6">
          © 2026 บริษัท เทคนิคอล วอเตอร์ จำกัด (TECHNICAL WATER CO.,LTD)
        </div>
      </div>
    </div>
  );
}
