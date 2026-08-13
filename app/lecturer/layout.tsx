import type { Metadata } from 'next';
import Link from 'next/link';
import { LecturerAuthGuard } from '@/components/lecturer/LecturerAuthGuard';

export const metadata: Metadata = {
  title: 'Lecturer | Meraki',
  description: 'Course, knowledge and student management',
};

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  return (
    <LecturerAuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <header className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/lecturer" className="text-lg font-semibold text-slate-900 dark:text-white">
              Meraki <span className="text-blue-600 dark:text-cyan-300">Lecturer</span>
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Student view
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </LecturerAuthGuard>
  );
}
