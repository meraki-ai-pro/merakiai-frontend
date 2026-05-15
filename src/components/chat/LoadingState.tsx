'use client';

import { Sparkles } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="flex gap-3 group">
      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-primary animate-spin-slow" />
      </div>
      
      <div className="flex flex-1 flex-col gap-2 max-w-2xl min-w-0">
        <div className="rounded-xl bg-card border border-border/30 px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-muted-foreground">Generating your response...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
