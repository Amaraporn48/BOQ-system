import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'ระบบจัดทำใบเสนอราคาและ BOQ (Quotation & BOQ Management)',
  description: 'ระบบจัดทำใบเสนอราคาและ Bill of Quantities ศูนย์กลางสำหรับองค์กรวิศวกรรมและรับเหมาก่อสร้าง',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-slate-50 antialiased flex flex-col md:flex-row text-slate-800 md:h-screen md:overflow-hidden">
        <AuthProvider>
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 min-h-screen md:min-h-0 md:h-screen md:overflow-y-auto">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
