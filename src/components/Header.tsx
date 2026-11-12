'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, FileText, PlusCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Header({
  title,
  subtitle,
  actions,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean);
    const crumbs: { label: string; href?: string }[] = [{ label: 'หน้าหลัก', href: '/' }];

    let currentPath = '';
    for (const part of parts) {
      currentPath += `/${part}`;
      if (part === 'documents') crumbs.push({ label: 'เอกสาร', href: '/documents' });
      else if (part === 'new') crumbs.push({ label: 'สร้างใหม่', href: currentPath });
      else if (part === 'edit') crumbs.push({ label: 'แก้ไข', href: currentPath });
      else if (part === 'compare') crumbs.push({ label: 'เปรียบเทียบ Revision', href: currentPath });
      else if (part === 'projects') crumbs.push({ label: 'โครงการ', href: '/projects' });
      else if (part === 'locations') crumbs.push({ label: 'สถานที่', href: '/locations' });
      else if (part === 'customers') crumbs.push({ label: 'ลูกค้า', href: '/customers' });
      else if (part === 'templates') crumbs.push({ label: 'เทมเพลต', href: '/templates' });
      else if (part === 'users') crumbs.push({ label: 'จัดการผู้ใช้', href: '/users' });
      else if (part === 'settings') crumbs.push({ label: 'ตั้งค่าระบบ', href: '/settings' });
      else if (part === 'demo') crumbs.push({ label: 'ตัวอย่าง (Demo)' });
      else if (part.length > 20) crumbs.push({ label: 'รายละเอียด', href: currentPath });
      else crumbs.push({ label: part, href: currentPath });
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="no-print bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={(crumb.href || crumb.label) + idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                {idx === breadcrumbs.length - 1 || !crumb.href ? (
                  <span className={idx === breadcrumbs.length - 1 ? 'font-semibold text-slate-800' : 'text-slate-500'}>
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="hover:text-blue-600 transition">
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Title and subtitle */}
          {title && <h1 className="text-xl font-bold text-slate-900 leading-tight">{title}</h1>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Action buttons */}
        {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
      </div>
    </header>
  );
}
