'use client';

import { Settings, Info } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-8 flex flex-col items-center text-center">
      <div className="h-12 w-12 rounded-xl bg-white/[0.04] flex items-center justify-center mb-4">
        <Settings className="h-6 w-6 text-white/25" />
      </div>
      <h2 className="text-sm font-semibold text-white/60 mb-2">Admin Settings</h2>
      <p className="text-xs text-white/30 max-w-sm leading-relaxed mb-6">
        Global configuration options — API keys, environment variables, and system toggles — are
        managed via the backend <code className="bg-white/[0.06] px-1 rounded">.env</code> file.
      </p>
      <div className="flex items-start gap-2 rounded-lg border border-indigo-400/20 bg-indigo-400/5 px-4 py-3 max-w-sm text-left">
        <Info className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-300/60 leading-relaxed">
          Key environment variables include <code className="bg-indigo-400/10 px-1 rounded">DID_API_KEY</code>,{' '}
          <code className="bg-indigo-400/10 px-1 rounded">OPENAI_API_KEY</code>,{' '}
          <code className="bg-indigo-400/10 px-1 rounded">ANTHROPIC_API_KEY</code>,{' '}
          <code className="bg-indigo-400/10 px-1 rounded">SUPABASE_URL</code>, and{' '}
          <code className="bg-indigo-400/10 px-1 rounded">PINECONE_API_KEY</code>.
        </p>
      </div>
    </div>
  );
}
