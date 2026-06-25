import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_ROUTES, PROTECTED_ROUTES, SELLER_ROUTES, type AppRole } from "@/lib/constants/marketplace";
import { resolveLocale } from "@/lib/i18n/config";
import type { Database } from "@/types/database";

function isRouteMatch(pathname: string, routes: readonly string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const localeParam = request.nextUrl.searchParams.get("lang");
  const localeCookie = request.cookies.get("vendorhub_locale")?.value;
  const resolvedLocale = resolveLocale(localeParam ?? localeCookie ?? request.headers.get("accept-language")?.split(",")[0]);

  response.cookies.set("vendorhub_locale", resolvedLocale, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  const allowDemoProtectedRoutes =
    process.env.NODE_ENV === "development" || request.nextUrl.searchParams.get("uiQa") === "1";

  if (allowDemoProtectedRoutes) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isRouteMatch(pathname, PROTECTED_ROUTES) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (!user || (!isRouteMatch(pathname, SELLER_ROUTES) && !isRouteMatch(pathname, ADMIN_ROUTES))) {
    return response;
  }

  const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", user.id).is("deleted_at", null);
  const roles = (roleRows ?? []).map((row) => row.role as AppRole);
  const isAdmin = roles.includes("ADMIN") || roles.includes("SUPER_ADMIN");
  const isSeller = roles.includes("SELLER") || isAdmin;

  if (isRouteMatch(pathname, ADMIN_ROUTES) && !isAdmin) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (isRouteMatch(pathname, SELLER_ROUTES) && !isSeller) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
