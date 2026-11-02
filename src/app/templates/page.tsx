'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { FileCode2, Plus, Layers, Eye, Sparkles, X } from 'lucide-react';
import Link from 'next/link';

export default function TemplatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [templates, setTemplates] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('งานระบบปรับอากาศ');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  const loadTemplates = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) loadTemplates();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const sampleItems = [
        {
          name: '1. หมวดงานจัดหาอุปกรณ์และวัสดุ',
          items: [
            { description: 'รายการตัวอย่างที่ 1', specification: 'มาตรฐานทั่วไป', unit: 'ชุด', quantity: 1, unitPrice: 10000, notes: '' },
          ],
        },
      ];

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category,
          defaultItemsJson: JSON.stringify(sampleItems),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowCreateModal(false);
        setName('');
        setDescription('');
        loadTemplates();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการสร้างเทมเพลต');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return <div className="p-8 text-center text-slate-400">กำลังโหลด...</div>;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="เทมเพลตมาตรฐาน (BOQ Templates)"
        subtitle="ชุดรายการงานและสเปคมาตรฐานสำหรับดึงไปใช้งานในใบเสนอราคาได้อย่างรวดเร็ว"
        actions={
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            สร้าง Template ใหม่
          </button>
        }
      />

      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fetching ? (
            <div className="col-span-3 p-12 text-center text-slate-400">กำลังโหลดเทมเพลต...</div>
          ) : templates.length === 0 ? (
            <div className="col-span-3 p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              ยังไม่มีเทมเพลตในระบบ
            </div>
          ) : (
            templates.map((tpl) => {
              let parsedItems: any[] = [];
              try {
                parsedItems =
                  typeof tpl.defaultItemsJson === 'string'
                    ? JSON.parse(tpl.defaultItemsJson)
                    : tpl.defaultItemsJson;
              } catch {
                parsedItems = [];
              }

              const totalRows = parsedItems.reduce(
                (sum: number, cat: any) => sum + (cat.items?.length || 0),
                0
              );

              return (
                <div
                  key={tpl.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                        {tpl.category}
                      </span>
                      {tpl.isSystem && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                          ระบบมาตรฐาน
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm">{tpl.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tpl.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {parsedItems.length} หมวด ({totalRows} รายการ)
                    </span>
                    <button
                      onClick={() => setSelectedTemplate(tpl)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      ดูโครงสร้างรายการ
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  {selectedTemplate.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedTemplate.description}</p>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-1 rounded text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs">
              {(() => {
                let list: any[] = [];
                try {
                  list =
                    typeof selectedTemplate.defaultItemsJson === 'string'
                      ? JSON.parse(selectedTemplate.defaultItemsJson)
                      : selectedTemplate.defaultItemsJson;
                } catch {
                  list = [];
                }

                return list.map((cat: any, cIdx: number) => (
                  <div key={cIdx} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800">
                      {cat.name}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {(cat.items || []).map((it: any, iIdx: number) => (
                        <div key={iIdx} className="p-2.5 flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium text-slate-900">{it.description}</div>
                            {it.specification && (
                              <div className="text-[11px] text-slate-500">
                                สเปค: {it.specification}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0 font-mono">
                            <div>
                              {it.quantity} {it.unit}
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              @฿{(it.unitPrice || 0).toLocaleString('th-TH')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Link
                href="/documents/new"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs"
              >
                ไปหน้าสร้างเอกสารเพื่อใช้งาน
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-sm text-slate-900">สร้าง Template ใหม่</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ชื่อเทมเพลต <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น งานติดตั้งระบบปั๊มน้ำ Booster Pump"
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">หมวดหมู่งาน</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 bg-white"
                >
                  <option value="งานระบบปรับอากาศ">งานระบบปรับอากาศ (HVAC)</option>
                  <option value="งานระบบไฟฟ้า">งานระบบไฟฟ้าและสื่อสาร (Electrical)</option>
                  <option value="งานระบบประปาและสุขาภิบาล">งานระบบประปาและสุขาภิบาล (Plumbing)</option>
                  <option value="งานซ่อมแซมและบำรุงรักษา">งานซ่อมแซมและบำรุงรักษา (Maintenance)</option>
                  <option value="งานปรับปรุงพื้นที่">งานปรับปรุงพื้นที่ (Renovation)</option>
                  <option value="งานบริการและค่าแรง">งานบริการและค่าแรง</option>
                  <option value="อื่น ๆ">อื่น ๆ</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">คำอธิบาย</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดเกี่ยวกับเทมเพลตนี้..."
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 text-slate-700 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
