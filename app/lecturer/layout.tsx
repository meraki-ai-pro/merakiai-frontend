import type { Metadata } from 'next';
import { LecturerAuthGuard } from '@/components/lecturer/LecturerAuthGuard';
import { LecturerHeader } from '@/components/lecturer/LecturerHeader';

export const metadata: Metadata = {
  title: { absolute: 'Meraki Instructor' },
  description: 'Course, knowledge and student management',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  return (
    <LecturerAuthGuard>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-blue-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <LecturerHeader />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </LecturerAuthGuard>
  );
}
