import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const ALLOWED_STATUS_PATHS = [
  /^rag\/status\/[^/]+$/,
  /^mode-sessions\/status\/[^/]+$/,
];

function isAllowedPath(path: string) {
  return ALLOWED_STATUS_PATHS.some((pattern) => pattern.test(path));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const backendPath = path.join('/');

  if (!isAllowedPath(backendPath)) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }

  const target = new URL(`/${backendPath}`, BACKEND_URL);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const response = await fetch(target, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...(request.headers.get('authorization')
        ? { Authorization: request.headers.get('authorization') as string }
        : {}),
    },
    cache: 'no-store',
  });

  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
