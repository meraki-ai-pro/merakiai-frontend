'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftRight, BookOpen, Mic, UserRound } from 'lucide-react';
import { MerakiLogo } from '@/components/common/MerakiLogo';
import { FeedbackButton } from '@/components/feedback/FeedbackDialog';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/lecturer', label: 'Your courses', icon: BookOpen },
  { href: '/lecturer/voice', label: 'Your voice', icon: Mic },
  { href: '/lecturer/account', label: 'Account', icon: UserRound },
] as const;

/** "Your courses" also covers a course workspace (/lecturer/<courseId>). */
function isActive(pathname: string, href: string) {
  if (href !== '/lecturer') return pathname.startsWith(href);
  return !NAV.some((n) => n.href !== '/lecturer' && pathname.startsWith(n.href));
}

export function LecturerHeader() {
  const pathname = usePathname() ?? '/lecturer';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-white/10 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/lecturer" className="flex flex-shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-white shadow-md shadow-blue-600/10 dark:border-white/10 dark:bg-white/10">
            <MerakiLogo variant="color" className="h-5 w-5" decorative />
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">
            Meraki <span className="text-blue-600 dark:text-cyan-300">Instructor</span>
          </span>
        </Link>

        {/* Its own row on narrow screens rather than a squeezed scroller. */}
        <nav
          className="order-last flex w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] md:order-none md:w-auto md:flex-1"
          aria-label="Instructor"
        >
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition',
                  active
                    ? 'bg-blue-50 font-medium text-blue-700 dark:bg-cyan-400/10 dark:text-cyan-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex flex-shrink-0 items-center gap-3">
          {/* Lecturers had no way to send feedback at all — the trigger lived
              only in the student header. */}
          <FeedbackButton showSessionSurvey={false} label="Feedback" />
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            aria-label="Student view"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Student view</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
