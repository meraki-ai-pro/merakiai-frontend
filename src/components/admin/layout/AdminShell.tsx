'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { apiClient } from '@/services/api';
import { useUserStore } from '@/store/userStore';
import { WorkspaceLogoutButton } from '@/components/common/WorkspaceLogoutButton';
import {
  LayoutDashboard,
  Users,
  FileText,
  MessagesSquare,
  MessageSquareHeart,
  Settings,
  GraduationCap,
  ChevronLeft,
  Sun,
  Moon,
  LogOut,
  Bell,
  Video,
  Shield,
  UserRound,
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
      { href: '/admin/account', label: 'Your account', icon: UserRound },
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
  const logout = useUserStore((state) => state.logout);

  const handleLogout = () => {
    apiClient.logout();
    logout();
    router.replace('/auth/login');
  };

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-full z-30 flex flex-col',
        'border-r border-white/60 bg-gradient-to-b from-white/[0.88] via-sky-50/[0.72] to-blue-50/[0.72] shadow-2xl shadow-blue-950/10 backdrop-blur-xl dark:border-white/10 dark:from-slate-950/[0.9] dark:via-slate-950/[0.86] dark:to-blue-950/[0.36]',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex items-center flex-shrink-0 h-16',
          collapsed ? 'justify-center px-0' : 'px-5 gap-3'
        )}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white/70 text-blue-700 shadow-lg shadow-blue-600/10 dark:border-white/10 dark:bg-white/[0.08] dark:text-cyan-100">
          <GraduationCap className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold leading-none text-slate-950 dark:text-white">Meraki</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
              <Shield className="h-2.5 w-2.5" /> Admin Console
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_ITEMS.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
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
                        'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all',
                        collapsed && 'justify-center px-0 py-2.5',
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100 dark:bg-cyan-300/[0.1] dark:text-cyan-100 dark:ring-cyan-300/[0.16]'
                          : 'text-slate-600 hover:bg-slate-950/[0.04] hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white'
                      )}
                      title={collapsed ? label : undefined}
                    >
                      <Icon
                        className={cn(
                          'flex-shrink-0 h-4 w-4',
                          isActive ? 'text-blue-600 dark:text-cyan-200' : ''
                        )}
                      />
                      {!collapsed && <span>{label}</span>}
                      {isActive && !collapsed && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-cyan-300" />
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
      <div className="flex-shrink-0 p-3 space-y-1">
        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-red-500/[0.12] hover:text-red-600 dark:text-slate-400 dark:hover:text-red-300',
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
            'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-950/[0.04] hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white',
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
      className="fixed top-0 right-0 z-20 flex h-16 items-center justify-between border-b border-white/60 bg-white/[0.72] px-6 shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/[0.72]"
    >
      {/* Left */}
      <div>
        <h1 className="text-sm font-semibold text-slate-950 dark:text-white">{getTitle()}</h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">Meraki Admin Console</p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Notification bell - placeholder */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-950/[0.04] hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-cyan-300" />
        </button>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-all hover:bg-slate-950/[0.04] hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}

        <WorkspaceLogoutButton />

        {/* Admin badge */}
        <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/[0.62] px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm dark:bg-cyan-300 dark:text-slate-950">
            <Shield className="h-3.5 w-3.5" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold leading-none text-slate-950 dark:text-white">
              {adminEmail ? adminEmail.split('@')[0] : 'Admin'}
            </p>
            <p className="mt-0.5 text-[10px] text-blue-700 dark:text-cyan-200">Administrator</p>
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
    <div className="relative min-h-screen overflow-hidden bg-[#edf6fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(56,189,248,0.22),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(237,232,176,0.28),transparent_25%),linear-gradient(135deg,rgba(255,255,255,0.68),rgba(126,200,227,0.1))] dark:bg-[radial-gradient(circle_at_18%_10%,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(245,197,163,0.12),transparent_25%)]" />
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <AdminTopbar sidebarWidth={sidebarWidth} />
      <main
        style={{ marginLeft: sidebarWidth, paddingTop: 64 }}
        className="relative z-10 min-h-screen transition-all duration-300 ease-in-out"
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
