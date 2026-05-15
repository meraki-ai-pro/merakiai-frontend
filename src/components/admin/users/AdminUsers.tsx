'use client';

import { useEffect, useState } from 'react';
import { adminApiClient } from '@/services/adminApi';
import type { AdminUser } from '@/services/adminApi';
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  Shield,
  Video,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await adminApiClient.getUsers();
    if (res.success && Array.isArray(res.data)) {
      setUsers(res.data);
    } else {
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border gap-4 flex-wrap">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          All Users
          {!loading && (
            <span className="ml-1 text-xs font-normal text-muted-foreground/60">({users.length})</span>
          )}
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email…"
              className="w-56 rounded-lg border border-border bg-accent pl-9 pr-3 py-1.5 text-xs text-foreground/90 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/90 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <UserCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground/70">{search ? 'No users match your search' : 'No users found'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                {['User', 'Role', 'Avatar', 'Voice', 'Joined'].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => (
                <tr
                  key={user.id}
                  className={cn(
                    'border-b border-border/50 hover:bg-card transition-colors',
                    i % 2 !== 0 && 'bg-muted/30'
                  )}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-7 w-7 flex-shrink-0 rounded-full bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-semibold text-primary">
                          {user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-foreground/90 font-medium">{user.email}</p>
                        <p className="text-[10px] text-muted-foreground/60 font-mono">{user.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold bg-primary/15 text-primary">
                        <Shield className="h-2.5 w-2.5" /> ADMIN
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/70">User</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {user.avatar_id ? (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400">
                        <Video className="h-2.5 w-2.5" />
                        {user.avatar_id} ({user.avatar_gender})
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs text-muted-foreground/70">{user.voice_id ?? '—'}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs text-muted-foreground/70">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
