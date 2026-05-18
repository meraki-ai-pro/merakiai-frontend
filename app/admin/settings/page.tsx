'use client';

import { Settings, Info } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/70 bg-white/[0.78] p-8 text-center shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-cyan-300/[0.1] dark:text-cyan-100">
        <Settings className="h-6 w-6" />
      </div>
      <h2 className="mb-2 text-sm font-semibold text-slate-950 dark:text-white">Admin Settings</h2>
      <p className="mb-6 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Global configuration options — API keys, environment variables, and system toggles — are
        managed via the backend <code className="rounded bg-slate-950/[0.06] px-1 dark:bg-white/[0.08]">.env</code> file.
      </p>
      <div className="flex max-w-sm items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-left dark:border-cyan-300/[0.2] dark:bg-cyan-300/[0.08]">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-700 dark:text-cyan-200" />
        <p className="text-xs leading-relaxed text-blue-900/70 dark:text-cyan-100/70">
          Key environment variables include <code className="rounded bg-blue-400/[0.12] px-1">DID_API_KEY</code>,{' '}
          <code className="rounded bg-blue-400/[0.12] px-1">OPENAI_API_KEY</code>,{' '}
          <code className="rounded bg-blue-400/[0.12] px-1">ANTHROPIC_API_KEY</code>,{' '}
          <code className="rounded bg-blue-400/[0.12] px-1">SUPABASE_URL</code>, and{' '}
          <code className="rounded bg-blue-400/[0.12] px-1">PINECONE_API_KEY</code>.
        </p>
      </div>
    </div>
  );
}
