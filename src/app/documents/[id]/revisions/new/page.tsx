'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function NewRevisionPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/documents/${id}/edit`);
    }
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-12 text-center text-slate-500">
      <div className="space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium">กำลังเปิดหน้าแก้ไขเพื่อสร้าง Revision ถัดไปให้อัตโนมัติ...</p>
      </div>
    </div>
  );
}
