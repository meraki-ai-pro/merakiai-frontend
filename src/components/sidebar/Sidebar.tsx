'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ConversationList } from './ConversationList';
import { NewChat } from './NewChat';
import { SidebarMenu } from './SidebarMenu';
import { MerakiLogo } from '@/components/common/MerakiLogo';
import { Archive, Film, GraduationCap, ListChecks, Search, type LucideIcon } from 'lucide-react';
import { useActivityStore } from '@/store/activityStore';
import { useCourseStore } from '@/store/courseStore';
import { useUIStore } from '@/store/uiStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const sidebarOpen    = useUIStore((s) => s.sidebarOpen);
  const isMobile       = useIsMobile();

  // Collapsed = icon-only on desktop only.
  // On mobile the sidebar is either fully open or hidden — never icon-only.
  const collapsed = !isMobile && !sidebarOpen;

  // Badges and the study lock. Refreshed on course change, on returning to the
  // tab, and once a minute — a lecturer can assign something at any time.
  const courseId = useCourseStore((s) => s.selectedCourseId);
  const { activities, examsDue, locked, refresh } = useActivityStore();
  useEffect(() => {
    void refresh(courseId);
    const again = () => void refresh(courseId);
    const t = setInterval(again, 60_000);
    window.addEventListener('focus', again);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', again);
    };
  }, [courseId, refresh]);
  const activitiesTodo = activities.filter((a) => a.status === 'todo').length;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-white/[0.88] via-sky-50/[0.72] to-blue-50/[0.72] text-slate-900 dark:from-slate-950/[0.9] dark:via-slate-950/[0.86] dark:to-blue-950/[0.36] dark:text-white">
      <div className={cn(
        'flex items-center flex-shrink-0',
        collapsed ? 'justify-center px-0 py-5' : 'gap-3 px-5 pb-4 pt-6'
      )}>
        <Link
          href="/dashboard"
          title="Back to learning"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-2xl flex-shrink-0',
            'border border-blue-200 bg-white/70 text-blue-700 shadow-lg shadow-blue-600/10',
            'hover:bg-blue-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
            'transition-all duration-150'
          )}
          aria-label="Go to learning dashboard"
        >
          <MerakiLogo variant="color" className="h-6 w-6" decorative />
        </Link>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold leading-none truncate">Meraki</p>
            {/* Was "AI Flotation Tutor" — a leftover from the single-course
                deployment, and wrong on every other course. */}
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">AI Study Tutor</p>
          </div>
        )}

      </div>

      {!collapsed && (
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions"
              className="h-10 w-full rounded-xl border border-slate-200/80 bg-white/[0.82] pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/70 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:focus:border-cyan-300/[0.5] dark:focus:ring-cyan-300/[0.16]"
            />
          </div>
        </div>
      )}

      {/* ── Primary actions ─────────────────────────────────────────────── */}
      <div className={cn('flex-shrink-0 pb-4', collapsed ? 'flex flex-col items-center gap-1 px-2 pt-2' : 'space-y-1 px-5')}>
        <NewChat iconOnly={collapsed} />
        <NavLink href="/dashboard/activities" testId="nav-activities" icon={ListChecks} label="Activities" collapsed={collapsed}
          badge={activitiesTodo} urgent={locked} badgeTitle={locked ? 'A required activity is waiting' : 'Activities to do'} />
        {/* Exams set by the lecturer. Pre/post tests were removed from the
            student view at the client's request. */}
        <NavLink href="/dashboard/assessments" testId="nav-assessments" icon={GraduationCap} label="Exams" collapsed={collapsed}
          badge={examsDue} badgeTitle="Exams you can sit now" />
        <NavLink href="/dashboard/videos" testId="nav-videos" icon={Film} label="YouTube Videos/Animations" collapsed={collapsed} />
        <NavLink href="/dashboard/archived" testId="nav-archived" icon={Archive} label="Archived" title="Archived sessions" collapsed={collapsed} />
      </div>

      {/* Section labels (Pinned / Recent) are drawn by ConversationList. */}

      {/* ── Conversation list — hidden in icon-only mode ─────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!collapsed && (
          <div className="px-4">
            <ConversationList searchQuery={searchQuery} />
          </div>
        )}
      </div>

      {/* ── Bottom menu ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pb-5 pt-3">
        <SidebarMenu collapsed={collapsed} />
      </div>

    </div>
  );
}

function NavLink({
  href, testId, icon: Icon, label, title, collapsed, badge = 0, urgent = false, badgeTitle,
}: {
  href: string; testId: string; icon: LucideIcon; label: string; title?: string; collapsed: boolean;
  badge?: number; urgent?: boolean; badgeTitle?: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testId}
      title={title ?? label}
      className={cn(
        'relative flex items-center rounded-2xl text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-cyan-300/[0.08] dark:hover:text-cyan-100',
        collapsed ? 'h-10 w-10 justify-center' : 'h-10 w-full gap-2 px-3',
      )}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {!collapsed && <span className="flex-1">{label}</span>}
      {badge > 0 && (
        <span
          title={badgeTitle}
          aria-label={`${badge} ${badgeTitle ?? ''}`}
          className={cn(
            'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white',
            urgent ? 'bg-amber-500' : 'bg-blue-600 dark:bg-cyan-400 dark:text-slate-950',
            collapsed && 'absolute -right-1 -top-1',
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
