import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy to the backend. Runs in the Next.js Node runtime, so it is
// same-origin to the browser (no CORS/preflight) and is not subject to ngrok's
// free-tier browser interstitial. The skip header is added here for good
// measure. Point NEXT_PUBLIC_API_BASE at "/api/backend" to route through this.
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function forward(request: NextRequest, path: string[]): Promise<NextResponse> {
  const backendPath = path.join('/');
  const target = new URL(`/${backendPath}`, BACKEND_URL);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const method = request.method;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };
  const auth = request.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  const contentType = request.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let response: Response;
  try {
    // redirect: 'manual' so we can re-resolve FastAPI's trailing-slash 307
    // against the backend origin. Auto-follow fails here because the redirect
    // Location can carry an http/host that isn't re-fetchable behind ngrok.
    response = await fetch(target, { method, headers, body, cache: 'no-store', redirect: 'manual' });
    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (location) {
        const resolved = new URL(location, target);
        const fixed = new URL(resolved.pathname + resolved.search, BACKEND_URL);
        response = await fetch(fixed, { method, headers, body, cache: 'no-store' });
      }
    }
  } catch (err) {
    console.error('[backend-proxy] upstream request failed', err);
    return NextResponse.json(
      { detail: 'The backend service is temporarily unavailable.' },
      { status: 502 },
    );
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  return forward(request, (await ctx.params).path);
}
export async function POST(request: NextRequest, ctx: Ctx) {
  return forward(request, (await ctx.params).path);
}
export async function PATCH(request: NextRequest, ctx: Ctx) {
  return forward(request, (await ctx.params).path);
}
// PUT is forwarded like the rest. forward() has always been method-agnostic —
// only the exported handler was missing, so a PUT endpoint 405'd at the proxy
// while working perfectly when called directly. That gap is invisible to any
// test that talks to the backend port instead of going through the app.
export async function PUT(request: NextRequest, ctx: Ctx) {
  return forward(request, (await ctx.params).path);
}
export async function DELETE(request: NextRequest, ctx: Ctx) {
  return forward(request, (await ctx.params).path);
}
