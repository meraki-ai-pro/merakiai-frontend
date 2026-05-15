'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { tokenStore } from '@/services/api';
import { apiClient } from '@/services/api';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessagesSquare,
  MessageSquareHeart,
  Settings,
  GraduationCap,
  ChevronLeft,
  Menu,
  Sun,
  Moon,
  LogOut,
  Bell,
  Video,
  Shield,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    group: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Management',
    items: [
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/documents', label: 'Documents', icon: FileText },
      { href: '/admin/sessions', label: 'Sessions', icon: MessagesSquare },
      { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareHeart },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/admin/system', label: 'Video & Media', icon: Video },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function AdminSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    tokenStore.clear();
    router.push('/auth/login');
  };

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full z-30 flex flex-col',
        'bg-card border-r border-border',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex items-center flex-shrink-0 h-16 border-b border-border',
          collapsed ? 'justify-center px-0' : 'px-5 gap-3'
        )}
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
          <GraduationCap className="h-4 w-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white leading-none">Meraki</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Shield className="h-2.5 w-2.5" /> Admin Console
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {NAV_ITEMS.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {group.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive =
                  href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                        collapsed && 'justify-center px-0 py-2.5',
                        isActive
                          ? 'bg-primary/15 text-primary/80 font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                      title={collapsed ? label : undefined}
                    >
                      <Icon
                        className={cn(
                          'flex-shrink-0 h-4 w-4',
                          isActive ? 'text-primary' : ''
                        )}
                      />
                      {!collapsed && <span>{label}</span>}
                      {isActive && !collapsed && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom: collapse + logout */}
      <div className="flex-shrink-0 border-t border-border p-2 space-y-0.5">
        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all',
            collapsed && 'justify-center px-0 py-2.5'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent transition-all',
            collapsed && 'justify-center px-0 py-2.5'
          )}
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 flex-shrink-0 transition-transform duration-300',
              collapsed && 'rotate-180'
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function AdminTopbar({ sidebarWidth }: { sidebarWidth: number }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    apiClient.getUserProfile().then((res) => {
      if (res.success && res.data) setAdminEmail(res.data.email);
    });
  }, []);

  // Derive page title from pathname
  const getTitle = () => {
    if (pathname === '/admin') return 'Dashboard';
    const segment = pathname.split('/')[2];
    if (!segment) return 'Dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <header
      style={{ left: sidebarWidth }}
      className="fixed top-0 right-0 z-20 h-16 flex items-center justify-between px-6 border-b border-border bg-background/90 backdrop-blur-sm"
    >
      {/* Left */}
      <div>
        <h1 className="text-sm font-semibold text-foreground">{getTitle()}</h1>
        <p className="text-[11px] text-muted-foreground">Meraki Admin Console</p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notification bell - placeholder */}
        <button className="relative h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400" />
        </button>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}

        {/* Admin badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-border">
          <div className="h-7 w-7 rounded-full bg-primary/20 ring-1 ring-primary/30 flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-foreground leading-none">
              {adminEmail ? adminEmail.split('@')[0] : 'Admin'}
            </p>
            <p className="text-[10px] text-primary/80 mt-0.5">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 68 : 240;

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <AdminTopbar sidebarWidth={sidebarWidth} />
      <main
        style={{ marginLeft: sidebarWidth, paddingTop: 64 }}
        className="min-h-screen transition-all duration-300 ease-in-out"
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
