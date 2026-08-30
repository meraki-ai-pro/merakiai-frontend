import type { Metadata } from 'next';
import Link from 'next/link';
import { LecturerAuthGuard } from '@/components/lecturer/LecturerAuthGuard';
import { FeedbackButton } from '@/components/feedback/FeedbackDialog';

export const metadata: Metadata = {
  title: { absolute: 'Meraki AI Lecturer Portal' },
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <header className="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/lecturer" className="text-lg font-semibold text-slate-900 dark:text-white">
              Meraki <span className="text-blue-600 dark:text-cyan-300">Lecturer</span>
            </Link>
            <nav className="flex items-center gap-5">
              {/* Lecturers had no way to send feedback at all — the trigger
                  lived only in the student header — so the admin inbox could
                  only ever contain student voices. */}
              <FeedbackButton showSessionSurvey={false} label="Feedback" />
              <Link
                href="/lecturer/voice"
                className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Your voice
              </Link>
              <Link
                href="/lecturer/account"
                className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Account
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Student view
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </LecturerAuthGuard>
  );
}
