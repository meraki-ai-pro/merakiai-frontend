export default function ResetPasswordLoading() {
  return (
    <div className="min-h-screen bg-background flex">

      {/* Left panel skeleton */}
      <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border/40 flex-col items-center justify-center p-12">
        <div className="max-w-sm w-full space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted animate-pulse" />
          <div className="h-8 w-32 rounded-lg bg-muted animate-pulse mx-auto" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse mx-auto" />
          <div className="h-4 w-48 rounded bg-muted animate-pulse mx-auto" />
          <div className="mt-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Right form skeleton */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-56 rounded bg-muted animate-pulse" />
          </div>
          <div className="space-y-4">
            {/* New password field */}
            <div className="space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-muted animate-pulse" />
              <div className="h-10 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-40 rounded bg-muted animate-pulse" />
            </div>
            {/* Confirm password field */}
            <div className="space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
              <div className="h-10 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-40 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-10 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
