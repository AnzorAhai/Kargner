import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/icons',
  '/uploads',
  '/service-worker.js'
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((publicPath) =>
    pathname === publicPath ||
    pathname.startsWith(publicPath + '/')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Middleware] Pathname: ${pathname}`);

  if (isPublic(pathname)) {
    console.log(`[Middleware] Public path, skipping auth check.`);
    return NextResponse.next();
  }

  // Проверяем наличие токена (авторизации)
  console.log(`[Middleware] Checking token...`);
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  console.log(`[Middleware] Token: ${JSON.stringify(token)}`);

  if (!token) {
    console.log(`[Middleware] No token found, redirecting to /login.`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  console.log(`[Middleware] Token found, proceeding.`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!login|register|api|_next|favicon.ico|manifest.json|icons|uploads|service-worker.js).*)',
  ],
}; 