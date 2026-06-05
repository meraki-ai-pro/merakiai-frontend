'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConversationList } from './ConversationList';
import { NewChat } from './NewChat';
import { SidebarMenu } from './SidebarMenu';
import { MerakiLogo } from '@/components/common/MerakiLogo';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const sidebarOpen    = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const isMobile       = useIsMobile();

  // Collapsed = icon-only on desktop only.
  // On mobile the sidebar is either fully open or hidden — never icon-only.
  const collapsed = !isMobile && !sidebarOpen;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-white/[0.88] via-sky-50/[0.72] to-blue-50/[0.72] text-slate-900 dark:from-slate-950/[0.9] dark:via-slate-950/[0.86] dark:to-blue-950/[0.36] dark:text-white">
      <div className={cn(
        'flex items-center flex-shrink-0',
        collapsed ? 'justify-center px-0 py-5' : 'gap-3 px-5 pb-4 pt-6'
      )}>
        <Link
          href="/"
          title="Back to home"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-2xl flex-shrink-0',
            'border border-blue-200 bg-white/70 text-blue-700 shadow-lg shadow-blue-600/10',
            'hover:bg-blue-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
            'transition-all duration-150'
          )}
          aria-label="Go to Meraki home page"
        >
          <MerakiLogo variant="color" className="h-6 w-6" decorative />
        </Link>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold leading-none truncate">Meraki</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">AI Flotation Tutor</p>
          </div>
        )}

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex-shrink-0 rounded-xl p-2 text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <PanelLeftOpen  className="h-4 w-4" />
              : <PanelLeftClose className="h-4 w-4" />
            }
          </button>
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
      <div className={cn('flex-shrink-0 pb-4', collapsed ? 'flex justify-center px-2 pt-2' : 'space-y-1 px-5')}>
        <NewChat iconOnly={collapsed} />
      </div>

      {/* ── Section label — full mode only ──────────────────────────────── */}
      {!collapsed && (
        <div className="flex-shrink-0 px-5 pb-1">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            Recent
          </p>
        </div>
      )}

      {/* ── Conversation list — hidden in icon-only mode ─────────────────── */}
      <ScrollArea className="flex-1 min-h-0">
        {!collapsed && (
          <div className="px-4">
            <ConversationList searchQuery={searchQuery} />
          </div>
        )}
      </ScrollArea>

      {/* ── Bottom menu ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pb-5 pt-3">
        <SidebarMenu collapsed={collapsed} />
      </div>

    </div>
  );
}
