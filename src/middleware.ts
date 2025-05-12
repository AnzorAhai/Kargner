import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Публичные пути, которые НЕ требуют авторизации
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api', // Обычно API-пути имеют свою логику авторизации
  '/_next', // Внутренние ресурсы Next.js
  '/favicon.ico',
  '/manifest.json',
  '/icons',
  '/uploads',
  '/service-worker.js' // Service Worker
];

// Функция для проверки, является ли путь публичным
function isPublic(pathname: string) {
  // Проверяем точное совпадение или начало пути (для папок)
  return PUBLIC_PATHS.some((publicPath) =>
    pathname === publicPath || pathname.startsWith(publicPath + '/')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // console.log(`[Middleware] Pathname: ${pathname}`); // Removed log

  // Шаг 1: Пропускаем публичные пути
  if (isPublic(pathname)) {
    // console.log(`[Middleware] Public path, skipping auth check.`); // Removed log
    return NextResponse.next(); // Пропускаем проверку для публичных путей
  }

  // Шаг 2: Проверяем токен для всех остальных путей
  // console.log(`[Middleware] Checking token for protected path...`); // Removed log
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  // console.log(`[Middleware] Token: ${JSON.stringify(token)}`); // Removed log

  // Шаг 3: Если токена нет (пользователь не авторизован), перенаправляем на /login
  if (!token) {
    // console.log(`[Middleware] No token found, redirecting to /login.`); // Removed log
    const loginUrl = new URL('/login', request.url); // Создаем URL для /login
    // Добавляем callbackUrl, чтобы после входа вернуть пользователя обратно
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl); // Выполняем редирект
  }

  // Шаг 4: Если токен есть, пропускаем пользователя дальше
  // console.log(`[Middleware] Token found, proceeding.`); // Removed log
  return NextResponse.next();
}

// Конфигурация: к каким путям применять middleware
export const config = {
  matcher: [
    /*
     * Применяем ко всем путям, КРОМЕ тех, что начинаются с:
     * - login
     * - register
     * - api (предполагается, что API-пути защищаются иначе)
     * - _next/static (статические файлы)
     * - _next/image (оптимизация изображений)
     * - icons (папка с иконками)
     * - uploads (папка с загрузками)
     * - favicon.ico
     * - manifest.json
     * - service-worker.js
     * По сути, это обратная логика к PUBLIC_PATHS, реализованная через negative lookahead.
     */
    '/((?!login|register|api|_next/static|_next/image|icons|uploads|favicon.ico|manifest.json|service-worker.js).*)',
  ],
}; 