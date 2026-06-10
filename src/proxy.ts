import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { unsealData } from 'iron-session';
import type { SessionData } from '@/types';

const COOKIE_NAME = 'gov-trend-session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPage = pathname.startsWith('/dashboard');
  const isProtectedApi =
    pathname.startsWith('/api/governors') ||
    pathname.startsWith('/api/crud') ||
    pathname.startsWith('/api/transactions');

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return unauthorized(request, isProtectedApi);
  }

  try {
    const session = await unsealData<SessionData>(sessionCookie, {
      password: process.env.SESSION_SECRET as string,
    });

    if (!session.isLoggedIn) {
      throw new Error('Invalid session');
    }

    return NextResponse.next();
  } catch {
    return unauthorized(request, isProtectedApi);
  }
}

function unauthorized(request: NextRequest, isApi: boolean): NextResponse {
  if (isApi) {
    return NextResponse.json(
      { resCd: '0002', resMsg: '세션이 만료되었습니다.' },
      { status: 401 }
    );
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/(.*)',
    '/api/governors/(.*)',
    '/api/crud',
    '/api/transactions/(.*)',
  ],
};