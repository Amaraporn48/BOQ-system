'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { Settings, Save, Download, Database, Building2, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<any>({
    companyNameTh: '',
    companyNameEn: '',
    taxId: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    quotationPrefix: 'QT',
    boqPrefix: 'BOQ',
    defaultVatRate: 7.0,
    defaultPaymentTerms: '',
    defaultWarrantyDuration: '',
  });

  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/login');
      else if (user.role !== 'admin') {
        alert('เฉพาะ Admin เท่านั้นที่สามารถเข้าถึงการตั้งค่าระบบได้');
        router.push('/');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetch('/api/settings')
        .then((r) => r.json())
        .then((data) => {
          if (data.settings) setSettings(data.settings);
        })
        .finally(() => setFetching(false));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  const handleBackupDownload = () => {
    window.open('/api/backup', '_blank');
  };

  if (loading || user?.role !== 'admin') return <div className="p-8 text-center text-slate-400">กำลังตรวจสอบสิทธิ์...</div>;

  return (
    <div className="flex-1 flex flex-col pb-24">
      <Header
        title="ตั้งค่าระบบและข้อมูลบริษัท (Company & System Settings)"
        subtitle="จัดการหัวเอกสาร PDF การคิดภาษี รูปแบบเลขที่เอกสาร และการสำรองฐานข้อมูล"
        actions={
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        }
      />

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {savedSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            บันทึกการตั้งค่าเรียบร้อยแล้ว ข้อมูลในเอกสารและ PDF จะอัปเดตตามค่าใหม่ทันที
          </div>
        )}

        {/* Company profile card */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              ข้อมูลหัวจดหมายบริษัท (ปรากฏบน PDF ใบเสนอราคาและ BOQ)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อบริษัท (ภาษาไทย)
                </label>
                <input
                  type="text"
                  value={settings.companyNameTh || ''}
                  onChange={(e) => setSettings({ ...settings, companyNameTh: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อบริษัท (ภาษาอังกฤษ)
                </label>
                <input
                  type="text"
                  value={settings.companyNameEn || ''}
                  onChange={(e) => setSettings({ ...settings, companyNameEn: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลขประจำตัวผู้เสียภาษี (13 หลัก)
                </label>
                <input
                  type="text"
                  value={settings.taxId || ''}
                  onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  value={settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">ที่อยู่จดทะเบียน</label>
                <input
                  type="text"
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">อีเมลติดต่อ</label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">เว็บไซต์</label>
                <input
                  type="text"
                  value={settings.website || ''}
                  onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
            </div>
          </div>

          {/* Numbering & Defaults */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" />
              การตั้งค่าเลขที่เอกสารและค่าเริ่มต้นทางการค้า
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prefix BOQ</label>
                <input
                  type="text"
                  value={settings.boqPrefix || 'BOQ'}
                  onChange={(e) => setSettings({ ...settings, boqPrefix: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">เช่น BOQ-2026-0001</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">อัตรา VAT เริ่มต้น (%)</label>
                <input
                  type="number"
                  step="any"
                  value={settings.defaultVatRate || 7.0}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultVatRate: Number(e.target.value) || 0 })
                  }
                  className="w-full border border-slate-300 rounded p-2 font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  เงื่อนไขการชำระเงินเริ่มต้น
                </label>
                <textarea
                  rows={2}
                  value={settings.defaultPaymentTerms || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultPaymentTerms: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ระยะเวลารับประกันเริ่มต้น
                </label>
                <input
                  type="text"
                  value={settings.defaultWarrantyDuration || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultWarrantyDuration: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Backup & Disaster Recovery Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              การสำรองข้อมูลฐานข้อมูล (Database Backup)
            </h3>
            <button
              type="button"
              onClick={handleBackupDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs"
            >
              <Download className="w-4 h-4" />
              ดาวน์โหลดไฟล์สำรองข้อมูล (JSON Backup)
            </button>
          </div>

          <div className="text-xs text-slate-600 space-y-2">
            <p>
              • <strong>ความสมบูรณ์ของฐานข้อมูล:</strong> ระบบใช้ฐานข้อมูลเชิงสัมพันธ์ SQLite
              พร้อม Prisma ORM รองรับ ACID Transaction เต็มรูปแบบ มี Foreign Keys
              และแยกลำดับ Revision ไว้อย่างชัดเจน
            </p>
            <p>
              • <strong>การสำรองข้อมูล (Backup):</strong> สามารถกดปุ่ม{' '}
              <span className="font-bold text-emerald-800">"ดาวน์โหลดไฟล์สำรองข้อมูล"</span>{' '}
              ด้านบน เพื่อบันทึกข้อมูลเอกสาร Revision ลูกค้า โครงการ และประวัติ Audit Log ทั้งหมดเป็นไฟล์ JSON หรือคัดลอกไฟล์{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">prisma/dev.db</code> เก็บไว้ได้โดยตรง
            </p>
            <p>
              • <strong>การกู้คืนข้อมูล (Restore):</strong> สามารถคัดลอกไฟล์สำรองกลับมาวางที่ตำแหน่ง{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">prisma/dev.db</code> หรือรันคำสั่ง{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">npm run db:seed</code> เพื่อรีเซ็ตข้อมูลเริ่มต้น
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
