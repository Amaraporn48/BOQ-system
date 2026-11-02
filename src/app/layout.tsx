import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'ระบบจัดทำใบเสนอราคาและ BOQ (Quotation & BOQ Management)',
  description: 'ระบบจัดทำใบเสนอราคาและ Bill of Quantities ศูนย์กลางสำหรับองค์กรวิศวกรรมและรับเหมาก่อสร้าง',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="h-screen overflow-hidden bg-slate-50 antialiased flex flex-col md:flex-row text-slate-800">
        <AuthProvider>
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
