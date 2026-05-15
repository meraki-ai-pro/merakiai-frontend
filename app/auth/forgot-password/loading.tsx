export default function ForgotPasswordLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-muted animate-pulse" />
          <div className="h-5 w-16 rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-8 w-52 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
            <div className="h-10 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="h-10 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-28 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}