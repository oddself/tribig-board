import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseEnv, getSupabaseEnv } from "@/lib/supabase/config";

const authRoutes = ["/login", "/signup"];
const publicRoutes = ["/", "/auth/callback"];

export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv()) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  // Handle trailing slashes and ensure exact match or sub-route match
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname === `${route}/` || (route !== "/" && pathname.startsWith(`${route}/`)));
  const isAuthRoute = authRoutes.some((route) => pathname === route || pathname === `${route}/`);

  if (!user && !isPublicRoute && !isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/clubs";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
