export default function SignupLoading() {
  return (
    <div className="min-h-screen bg-background flex">

      {/* Left panel skeleton */}
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border/40 flex-col items-center justify-center p-12">
        <div className="max-w-sm w-full space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted animate-pulse" />
          <div className="h-8 w-32 rounded-lg bg-muted animate-pulse mx-auto" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse mx-auto" />
          <div className="mt-6 rounded-xl border border-border/40 p-5 space-y-2">
            <div className="h-3.5 w-20 rounded bg-muted animate-pulse" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 rounded bg-muted animate-pulse" style={{ width: `${55 + i * 7}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Right form skeleton */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-44 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-52 rounded bg-muted animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
                <div className="h-10 rounded-md bg-muted animate-pulse" />
              </div>
            ))}
            <div className="h-10 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}