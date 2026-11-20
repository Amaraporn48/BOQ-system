import React from 'react';

export const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DRAFT: {
    label: 'กำลังจัดทำ (ราคายังไม่เสร็จ)',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
  },
  IN_PROGRESS: {
    label: 'กำลังจัดทำ (ราคายังไม่เสร็จ)',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
  },
  PENDING_REVIEW: {
    label: 'รออนุมัติ (พร้อมตรวจ)',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-400',
  },
  APPROVED: {
    label: 'อนุมัติแล้ว',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
  },
  SENT: {
    label: 'ส่งลูกค้าแล้ว (Sent)',
    color: 'text-indigo-800',
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
  },
  ACCEPTED: {
    label: 'ลูกค้ารับราคา (Accepted)',
    color: 'text-green-800',
    bg: 'bg-green-100',
    border: 'border-green-400',
  },
  REJECTED: {
    label: 'ปฏิเสธ (Rejected)',
    color: 'text-rose-800',
    bg: 'bg-rose-50',
    border: 'border-rose-300',
  },
  CANCELLED: {
    label: 'ยกเลิก (Cancelled)',
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    border: 'border-gray-300',
  },
};

export function StatusBadge({ status }: { status: string }) {
  const conf = STATUS_LABELS[status] || {
    label: status,
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${conf.bg} ${conf.color} ${conf.border}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {conf.label}
    </span>
  );
}

export function DocTypeBadge({ type }: { type: string }) {
  const isQt = type === 'QUOTATION';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wider ${
        isQt
          ? 'bg-blue-900 text-white'
          : 'bg-emerald-800 text-white'
      }`}
    >
      {isQt ? 'QUOTATION' : 'BOQ'}
    </span>
  );
}

export function RevisionBadge({ code, isLatest }: { code: string; isLatest?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-200 text-slate-800">
        {code}
      </span>
      {isLatest && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          ล่าสุด
        </span>
      )}
    </span>
  );
}
