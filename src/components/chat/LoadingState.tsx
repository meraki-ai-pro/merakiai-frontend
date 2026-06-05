'use client';

import { MerakiLogo } from '@/components/common/MerakiLogo';

export function LoadingState() {
  return (
    <div className="group flex gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm ring-2 ring-blue-200 dark:bg-cyan-300 dark:text-slate-950 dark:ring-cyan-300/[0.2]">
        <MerakiLogo variant="white" className="h-5 w-5 animate-pulse dark:hidden" decorative />
        <MerakiLogo variant="color" className="hidden h-5 w-5 animate-pulse dark:block" decorative />
      </div>
      
      <div className="flex max-w-2xl flex-1 flex-col gap-2 min-w-0">
        <div className="rounded-2xl border border-white/70 bg-white/[0.88] px-4 py-3 shadow-sm shadow-blue-950/5 backdrop-blur dark:border-white/10 dark:bg-white/[0.06]">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 dark:bg-cyan-300" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 dark:bg-cyan-300" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 dark:bg-cyan-300" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Generating your response...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
