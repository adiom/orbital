import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { guestRegex, shouldUseSecureCookies } from "./lib/constants";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return NextResponse.next();
  }

  // Разрешить доступ к документации API без авторизации
  if (pathname.startsWith("/docs") || pathname.startsWith("/api/docs")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    // NextResponse.next() создает объект ответа, который пропускает запрос дальше по пайплайну Middleware или к конечной точке обработчика,
    // то есть не выполняет никаких изменений или редиректов. По сути это "пропуск" запроса дальше без вмешательства.
    return NextResponse.next();
  }

  // Получаем токен пользователя из заголовков запроса
  // getToken - это функция из библиотеки next-auth, которая
  // извлекает токен из HTTP-заголовков запроса
  // req - это объект запроса, который мы передаем в getToken
  // secret - это секретный ключ, который используется для
  // генерации и проверки подписи токена. Этот ключ должен быть
  // таким же, как и в настройках next-auth в файле next.config.js,
  // иначе проверка подписи не будет пройдена
  // secureCookie - это флаг, который указывает, должен ли токен
  // быть защищен с использованием HTTPS. В данном случае мы
  // устанавливаем его в true, если это не окружение разработки

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: shouldUseSecureCookies,
  });

  // Разрешить доступ к страницам auth без токена
  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.next();
  }

  const isGuest = guestRegex.test(token?.email ?? "");

  if (token && !isGuest && ["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/docs", // Добавлено
    "/api/docs", // Добавлено
    "/api/:path*",
    "/login",
    "/register",

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
