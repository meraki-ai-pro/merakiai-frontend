export default function DashboardLoading() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* Sidebar skeleton */}
      <aside className="w-60 flex-shrink-0 border-r border-border/40 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border/40">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse flex-shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-16 rounded bg-muted animate-pulse" />
            <div className="h-3 w-28 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="px-3 pt-3 pb-2">
          <div className="h-9 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="px-4 pb-2">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex-1 px-2 space-y-1 pt-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg px-3 py-2.5 space-y-1.5">
              <div className="h-3 rounded bg-muted animate-pulse" style={{ width: `${50 + i * 10}%` }} />
              <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        <div className="border-t border-border/40 px-3 py-3 space-y-1">
          <div className="h-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-8 rounded-lg bg-muted animate-pulse" />
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="flex flex-1 flex-col min-w-0">
        <div className="flex-shrink-0 h-14 border-b border-border/50 flex items-center px-4 gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="h-16 w-16 rounded-2xl bg-muted animate-pulse" />
          <div className="space-y-2 text-center">
            <div className="h-7 w-48 rounded-lg bg-muted animate-pulse mx-auto" />
            <div className="h-4 w-72 rounded bg-muted animate-pulse mx-auto" />
          </div>
          <div className="grid grid-cols-3 gap-3 w-full max-w-xl">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
          <div className="w-full max-w-xl space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </div>
        <div className="border-t border-border/50 px-4 py-3">
          <div className="mx-auto max-w-3xl h-12 rounded-xl bg-muted animate-pulse" />
        </div>
      </main>
    </div>
  );
}