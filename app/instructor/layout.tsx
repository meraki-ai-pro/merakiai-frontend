import type { Metadata } from 'next';
import Link from 'next/link';
import { InstructorAuthGuard } from '@/components/instructor/InstructorAuthGuard';
import { MerakiLogo } from '@/components/common/MerakiLogo';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { WorkspaceLogoutButton } from '@/components/common/WorkspaceLogoutButton';
import { ArrowLeft, GraduationCap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Instructor | Meraki',
  description: 'Course, knowledge and student management',
};

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <InstructorAuthGuard>
      <div className="relative min-h-screen overflow-hidden bg-[#edf6fb] text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_88%_14%,rgba(237,232,176,0.3),transparent_25%),linear-gradient(135deg,rgba(255,255,255,0.68),rgba(126,200,227,0.1))] dark:bg-[radial-gradient(circle_at_12%_8%,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_88%_14%,rgba(245,197,163,0.12),transparent_25%)]" />

        <header className="sticky top-0 z-30 border-b border-white/60 bg-white/[0.72] shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/[0.72]">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/instructor" className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white/80 shadow-lg shadow-blue-600/10 dark:border-cyan-200/30 dark:bg-white/10">
                <MerakiLogo variant="color" className="h-6 w-6 dark:hidden" decorative />
                <MerakiLogo variant="white" className="hidden h-6 w-6 dark:block" decorative />
              </span>
              <span className="min-w-0">
                <span className=" flex items-center gap-1 truncate text-sm font-semibold">
                  <GraduationCap className="h-4 w-4" /> Meraki Instructor
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Learning workspace</span>
              </Link>
              <ThemeToggle />
              <WorkspaceLogoutButton />
            </div>
          </div>
        </header>
        <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </InstructorAuthGuard>
  );
}
