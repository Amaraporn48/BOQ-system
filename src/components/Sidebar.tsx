'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  UserCog,
  Settings,
  PlusCircle,
  LogOut,
  Building2,
  Edit2,
  X,
  Menu,
  CheckCircle,
  KeyRound,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, refreshUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Self Profile Edit Modal State (all hooks must be at the top)
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Load collapsed preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('boq_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // localStorage may fail in some environments
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('boq_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Auto-close mobile drawer when navigating to a new page
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Hide sidebar completely on login page (must be AFTER all hooks)
  if (pathname === '/login') {
    return null;
  }

  interface NavItem {
    name: string;
    href: string;
    icon: any;
    active: boolean;
    adminOnly?: boolean;
  }

  interface NavGroup {
    title: string;
    adminOnly?: boolean;
    items: NavItem[];
  }

  const menuGroups: NavGroup[] = [
    {
      title: 'ภาพรวม (Overview)',
      items: [
        {
          name: 'Dashboard (หน้าหลัก)',
          href: '/',
          icon: LayoutDashboard,
          active: pathname === '/',
        },
      ],
    },
    {
      title: 'จัดการเอกสาร (Documents)',
      items: [
        {
          name: 'เอกสารทั้งหมด',
          href: '/documents',
          icon: FileText,
          active: pathname.startsWith('/documents') && !pathname.includes('/new'),
        },
        {
          name: 'สร้างเอกสารใหม่',
          href: '/documents/new',
          icon: PlusCircle,
          active: pathname === '/documents/new',
        },
      ],
    },
    {
      title: 'รายชื่อโรงพยาบาลและลูกค้า (Directory)',
      items: [
        {
          name: 'รายชื่อโรงพยาบาล / ลูกค้า',
          href: '/customers',
          icon: Building2,
          active: pathname.startsWith('/customers') || pathname.startsWith('/locations'),
        },
      ],
    },
    {
      title: 'การจัดการและระบบ (Admin)',
      adminOnly: true,
      items: [
        {
          name: 'จัดการผู้ใช้งาน (Users)',
          href: '/users',
          icon: UserCog,
          active: pathname.startsWith('/users'),
          adminOnly: true,
        },
        {
          name: 'ตั้งค่าระบบและบริษัท',
          href: '/settings',
          icon: Settings,
          active: pathname.startsWith('/settings'),
          adminOnly: true,
        },
      ],
    },
  ];

  const handleOpenProfileModal = () => {
    if (!user) return;
    setProfileName(user.name || '');
    setProfileUsername(user.username || '');
    setProfileEmail(user.email || '');
    setProfilePassword('');
    setProfileError('');
    setProfileSuccess('');
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!profileName.trim()) {
      setProfileError('กรุณากรอกชื่อ-นามสกุล');
      return;
    }
    if (!profileUsername.trim()) {
      setProfileError('กรุณากรอกชื่อผู้ใช้งาน (Username)');
      return;
    }

    setSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: profileName.trim(),
          username: profileUsername.trim(),
          email: profileEmail.trim() || undefined,
          password: profilePassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setProfileSuccess('บันทึกข้อมูลเรียบร้อยแล้ว');
        await refreshUser();
        setTimeout(() => {
          setShowProfileModal(false);
          setProfileSuccess('');
        }, 600);
      } else {
        setProfileError(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch {
      setProfileError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setSavingProfile(false);
    }
  };

  const renderSidebarContent = (isMobile = false) => {
    const collapsed = !isMobile && isCollapsed;

    return (
      <div className="flex flex-col h-full select-none">
        {/* Brand Header */}
        <div className={`border-b border-slate-800 flex items-center transition-all ${
          collapsed ? 'p-3 flex-col gap-2 justify-center' : 'p-4 md:p-5 justify-between gap-3'
        }`}>
          <div className={`flex items-center min-w-0 ${collapsed ? 'flex-col gap-2' : 'gap-3'}`}>
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-md overflow-hidden shrink-0 p-1">
              <img
                src="/tw-icon.png"
                alt="Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            {!collapsed && (
              <div className="leading-tight truncate">
                <div className="font-bold text-white text-sm tracking-wide truncate">TECHNICAL WATER</div>
                <div className="text-[11px] text-blue-300 font-medium truncate">BOQ & Quotation System</div>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button (Collapse/Expand) */}
          {!isMobile && (
            <button
              type="button"
              onClick={toggleCollapse}
              title={collapsed ? 'ขยายแถบเมนู (Expand)' : 'ย่อแถบเมนู (Collapse)'}
              aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5 text-blue-400" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Mobile Close Button */}
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className={`flex-1 overflow-y-auto space-y-4 ${collapsed ? 'p-2' : 'p-3'}`}>
          {menuGroups.map((group) => {
            if (group.adminOnly && user?.role !== 'admin') return null;

            return (
              <div key={group.title} className="space-y-1">
                {!collapsed ? (
                  <div className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between">
                    <span>{group.title}</span>
                  </div>
                ) : (
                  <div className="my-2 border-t border-slate-800/80 mx-1" />
                )}

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    if (item.adminOnly && user?.role !== 'admin') return null;
                    const Icon = item.icon;

                    if (collapsed) {
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          title={item.name}
                          className={`flex items-center justify-center p-2.5 rounded-xl transition-all group relative ${
                            item.active
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          {/* Floating Tooltip */}
                          <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-xs font-medium rounded-lg shadow-xl border border-slate-800 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                            {item.name}
                          </span>
                        </Link>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                          item.active
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Section at bottom */}
        <div className={`border-t border-slate-800 bg-slate-950/60 ${collapsed ? 'p-2' : 'p-3'}`}>
          {user ? (
            collapsed ? (
              <div className="flex flex-col items-center gap-2 py-1">
                <button
                  type="button"
                  onClick={handleOpenProfileModal}
                  title={`${user.name} (@${user.username}) - คลิกเพื่อแก้ไขโปรไฟล์`}
                  className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-blue-900/40 text-blue-300 font-bold flex items-center justify-center text-xs border border-slate-700 transition relative group"
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-xs font-medium rounded-lg shadow-xl border border-slate-800 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {user.name} ({user.role})
                  </span>
                </button>
                <button
                  onClick={() => logout()}
                  title="ออกจากระบบ"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      {user.role}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate">@{user.username}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Edit Profile Button (Opens Modal Directly) */}
                  <button
                    type="button"
                    onClick={handleOpenProfileModal}
                    title="แก้ไขข้อมูลบัญชีของฉัน (ชื่อ, username, รหัสผ่าน)"
                    className="p-1.5 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => logout()}
                    title="ออกจากระบบ"
                    className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block text-center py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 1. Mobile Top Header Bar (Shown on Mobile & Tablets < 768px, Hidden on Desktop md+) */}
      <header className="no-print md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 select-none shadow-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-xs">
            <img src="/tw-icon.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="leading-tight truncate">
            <div className="font-bold text-xs tracking-wide text-white truncate">TECHNICAL WATER</div>
            <div className="text-[10px] text-blue-300 truncate">BOQ System</div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {user && (
            <span className="text-[11px] text-slate-300 font-medium hidden sm:inline-block truncate max-w-[120px]">
              {user.name.split(' ')[0]}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="เปิดเมนูนำทาง"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Mobile Drawer & Backdrop Overlay */}
      {mobileOpen && (
        <div className="no-print md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Sidebar */}
          <aside className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-200 flex flex-col h-full shadow-2xl z-10 border-r border-slate-800 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* 3. Desktop Sidebar (Always visible on Desktop md+, Hidden on Mobile) */}
      <aside
        className={`no-print hidden md:flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800 select-none bg-slate-900 text-slate-200 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:w-[72px]' : 'md:w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Self Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">แก้ไขข้อมูลบัญชีของฉัน</h3>
                  <p className="text-[11px] text-slate-500">อัปเดตชื่อผู้ใช้, ชื่อ-นามสกุล หรือรหัสผ่าน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
              {profileError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {profileError}
                </div>
              )}

              {profileSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  {profileSuccess}
                </div>
              )}

              {/* Role Indicator (Read Only) */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  สิทธิ์การใช้งานปัจจุบัน
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-blue-100 text-blue-800">
                  {user?.role}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้ใช้งาน (Username) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-mono">@</span>
                  <input
                    type="text"
                    required
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value.replace(/^@/, ''))}
                    placeholder="username"
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  อีเมล (Email)
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  เปลี่ยนรหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white placeholder:text-slate-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * หากไม่ต้องการเปลี่ยนรหัสผ่าน ให้ปล่อยช่องนี้ว่างไว้
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {savingProfile ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
