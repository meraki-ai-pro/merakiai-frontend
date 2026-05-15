'use client';

import Link from 'next/link';
import { ConversationList } from './ConversationList';
import { NewChat } from './NewChat';
import { SidebarMenu } from './SidebarMenu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GraduationCap, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const sidebarOpen    = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const isMobile       = useIsMobile();

  // Collapsed = icon-only on desktop only.
  // On mobile the sidebar is either fully open or hidden — never icon-only.
  const collapsed = !isMobile && !sidebarOpen;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden text-sidebar-foreground">
      <div className={cn(
        'flex items-center flex-shrink-0 border-b border-border/40',
        collapsed ? 'justify-center px-0 py-5' : 'gap-3 px-4 py-5'
      )}>
        <Link
          href="/"
          title="Back to home"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0',
            'bg-primary/15 ring-1 ring-primary/25',
            'hover:bg-primary/25 hover:ring-primary/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'transition-all duration-150'
          )}
          aria-label="Go to Meraki home page"
        >
          <GraduationCap className="h-4 w-4 text-primary" />
        </Link>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground leading-none truncate">Meraki</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">Froth Flotation Tutor</p>
          </div>
        )}

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex-shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <PanelLeftOpen  className="h-4 w-4" />
              : <PanelLeftClose className="h-4 w-4" />
            }
          </button>
        )}
      </div>

      {/* ── New chat ────────────────────────────────────────────────────── */}
      <div className={cn('flex-shrink-0 pt-3 pb-2', collapsed ? 'flex justify-center px-2' : 'px-3')}>
        <NewChat iconOnly={collapsed} />
      </div>

      {/* ── Section label — full mode only ──────────────────────────────── */}
      {!collapsed && (
        <div className="flex-shrink-0 px-4 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Recent Sessions
          </p>
        </div>
      )}

      {/* ── Conversation list — hidden in icon-only mode ─────────────────── */}
      <ScrollArea className="flex-1 min-h-0">
        {!collapsed && (
          <div className="px-2">
            <ConversationList />
          </div>
        )}
      </ScrollArea>

      {/* ── Bottom menu ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border/40 px-3 py-3">
        <SidebarMenu collapsed={collapsed} />
      </div>

    </div>
  );
}