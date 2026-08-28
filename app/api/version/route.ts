import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Lets the deployment gate prove that the requested Git commit—not merely an
 * older healthy deployment—is serving the production domain.
 */
export function GET() {
  return NextResponse.json(
    {
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
