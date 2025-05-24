import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Временно отключаем middleware для отладки
  console.log("Middleware running for path:", pathname);
  return NextResponse.next();

  /*
  // Проверяем, является ли маршрут защищенным
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/chats') ||
    pathname.startsWith('/schedule') ||
    pathname.startsWith('/homework');

  // Проверяем, является ли маршрут страницей аутентификации
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register');

  // Если это не защищенный маршрут и не страница аутентификации, пропускаем
  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  // Создаем клиент Supabase
  const supabase = createClient();

  // Получаем текущую сессию
  const { data: { session } } = await supabase.auth.getSession();

  console.log("Middleware session check:", {
    path: pathname,
    hasSession: !!session,
    isProtectedRoute,
    isAuthRoute
  });

  // Если пользователь не аутентифицирован и пытается получить доступ к защищенному маршруту
  if (!session && isProtectedRoute) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Если пользователь аутентифицирован и пытается получить доступ к странице аутентификации
  if (session && isAuthRoute) {
    const redirectUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
  */
}

// Указываем, для каких маршрутов должен выполняться middleware
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/chats/:path*',
    '/schedule/:path*',
    '/homework/:path*',
    '/login',
    '/register',
  ],
};
