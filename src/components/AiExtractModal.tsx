'use client';

import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, X, Loader2, ArrowRight, ShieldCheck, Key } from 'lucide-react';

interface AiExtractModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  filename: string;
  onApplyData: (data: {
    categories: any[];
    title?: string;
    customerName?: string;
    workingLocation?: string;
    notes?: string;
  }) => void;
}

export function AiExtractModal({
  isOpen,
  onClose,
  fileUrl,
  filename,
  onApplyData,
}: AiExtractModalProps) {
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [saveKeyPermanently, setSaveKeyPermanently] = useState(true);

  if (!isOpen) return null;

  const startExtraction = async (apiKeyOverride?: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/ai/extract-boq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl,
          apiKey: apiKeyOverride || customKey || undefined,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setExtractedData(json.data);
        setShowKeyInput(false);

        // If user entered key and checked save permanently
        if (apiKeyOverride && saveKeyPermanently) {
          fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ geminiApiKey: apiKeyOverride }),
          }).catch(() => {});
        }
      } else if (json.error === 'MISSING_API_KEY') {
        setShowKeyInput(true);
        setErrorMsg(json.message);
      } else {
        setErrorMsg(json.message || json.error || 'เกิดข้อผิดพลาดในการประมวลผลด้วย AI');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!extractedData) return;
    onApplyData({
      categories: extractedData.categories,
      title: extractedData.title,
      customerName: extractedData.customerName,
      workingLocation: extractedData.workingLocation,
      notes: extractedData.notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">Gemini AI Smart BOQ Extractor</h3>
              <p className="text-xs text-white/80">
                ดึงรายการจากเอกสารแนบแปลงเป็นตารางดิจิทัล พร้อมตรวจทานตัวเลขคณิตศาสตร์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
          {/* File Target Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-slate-700">เอกสารเป้าหมาย:</span>
              <span className="font-mono text-blue-700 truncate">{filename || fileUrl}</span>
            </div>
            {!loading && !extractedData && !showKeyInput && (
              <button
                type="button"
                onClick={() => startExtraction()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs shrink-0 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>เริ่มประมวลผลเอกสาร</span>
              </button>
            )}
          </div>

          {/* Loading Animation */}
          {loading && (
            <div className="py-12 text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-200 animate-ping"></div>
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-white shadow-lg">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  กำลังอ่านและวิเคราะห์เอกสารด้วย Gemini 2.5 AI...
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  กำลังแยกหมวดงาน รายละเอียด สเปก ราคาต่อหน่วย และตรวจสอบความถูกต้องของสมการคณิตศาสตร์
                </p>
              </div>
            </div>
          )}

          {/* Missing API Key Input */}
          {showKeyInput && (
            <div className="p-5 bg-amber-50 border border-amber-300 rounded-xl space-y-4">
              <div className="flex items-start gap-3">
                <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-amber-900">ระบุ Gemini API Key</h4>
                  <p className="text-xs text-amber-700">
                    ระบบต้องการ Gemini API Key เพื่อประมวลผลเอกสาร สามารถขอรับได้ฟรีโดยไม่มีค่าใช้จ่ายที่{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline text-blue-700 hover:text-blue-900"
                    >
                      Google AI Studio (aistudio.google.com) ↗
                    </a>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="password"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="วาง API Key เช่น AIzaSy..."
                  className="w-full border border-amber-300 rounded-lg px-3 py-2 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />

                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={saveKeyPermanently}
                    onChange={(e) => setSaveKeyPermanently(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>บันทึก API Key นี้ลงในการตั้งค่าระบบถาวร (ใช้งานได้ตลอดโดยไม่ต้องกรอกซ้ำ)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={!customKey.trim() || loading}
                  onClick={() => startExtraction(customKey.trim())}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition disabled:opacity-50"
                >
                  บันทึกและเริ่มสแกน
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && !showKeyInput && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold">เกิดข้อผิดพลาด</h5>
                <p className="text-xs mt-0.5">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => startExtraction()}
                  className="mt-2 text-xs font-bold text-blue-700 hover:underline"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            </div>
          )}

          {/* Extraction Result Preview */}
          {extractedData && (
            <div className="space-y-4">
              {/* Success Badge */}
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-950">
                      สกัดข้อมูลจากเอกสารสำเร็จเรียบร้อย!
                    </h4>
                    <p className="text-xs text-emerald-800">
                      ตรวจพบ <strong>{extractedData.categoryCount} หมวดงาน</strong> รวม{' '}
                      <strong>{extractedData.itemCount} รายการ</strong>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-emerald-700 block">ยอดรวมที่ตรวจพบ</span>
                  <span className="font-mono font-bold text-base text-emerald-900">
                    ฿{extractedData.subtotal?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Mathematical Verification Alert */}
              {extractedData.mathVerification?.isValid ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>ตรวจสอบผลลัพธ์ทางคณิตศาสตร์:</strong> จำนวนคูณราคาต่อหน่วยตรงกันทุกแถว 100%
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1 text-amber-900">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>
                      พบตัวเลขที่อาจไม่ตรงกับผลคูณ {extractedData.mathVerification?.warningsCount} รายการ:
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5 pl-2 max-h-24 overflow-y-auto">
                    {extractedData.mathVerification?.warnings?.map((w: string, idx: number) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-amber-700 italic">
                    * เมื่อนำเข้าตาราง ระบบจะไฮไลต์แถวเหล่านี้ให้คุณตรวจสอบและแก้ไขได้ง่ายๆ ครับ
                  </p>
                </div>
              )}

              {/* Categories Accordion / Preview List */}
              <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-60 overflow-y-auto">
                <span className="font-bold text-slate-700 block mb-1">ตัวอย่างรายการที่ตรวจพบ:</span>
                {extractedData.categories?.map((cat: any, cIdx: number) => (
                  <div key={cIdx} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900 flex justify-between">
                      <span>{cat.name}</span>
                      <span className="text-slate-500 font-normal">({cat.items?.length || 0} รายการ)</span>
                    </div>
                    <div className="divide-y divide-slate-100 text-[11px] text-slate-600">
                      {cat.items?.slice(0, 3).map((it: any, iIdx: number) => (
                        <div key={iIdx} className="py-1 flex justify-between items-center">
                          <span className="truncate pr-2">
                            {it.itemNo}. {it.description}
                          </span>
                          <span className="font-mono shrink-0">
                            {it.quantity} {it.unit} × ฿{it.unitPrice?.toLocaleString()} = ฿{it.amount?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {(cat.items?.length || 0) > 3 && (
                        <div className="py-0.5 text-slate-400 italic">
                          ...และอีก {cat.items.length - 3} รายการในหมวดนี้
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 text-xs transition"
          >
            ยกเลิก
          </button>

          {extractedData && (
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
            >
              <span>นำเข้าข้อมูลลงในตาราง BOQ ทันที</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
