import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/register", "/pending", "/api/auth", "/forms", "/view", "/api/forms", "/api/documents", "/demo-intake", "/api/demo-intake"];

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  owner: "/owner",
  employee: "/employee",
  pending: "/pending",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let Next.js internals and static files through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const { supabase, supabaseResponse, user } = await updateSession(request);

  // ── Unauthenticated ──────────────────────────────────────
  if (!user) {
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (isPublic) return supabaseResponse;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Authenticated: get role ──────────────────────────────
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, onboarding_complete")
    .eq("id", user.id)
    .single();

  // PGRST116 = no row found, which is a legitimate "not yet assigned a
  // role" state. Any other error (bad column, RLS misconfig, connection
  // issue, etc.) is a real bug — treating it as "pending" would silently
  // lock every affected user out of their dashboard with no visible cause.
  // Fail open instead: log loudly and let the request through unchanged.
  if (profileError && profileError.code !== "PGRST116") {
    console.error("[middleware] profile query failed for user", user.id, profileError.message);
    return supabaseResponse;
  }

  const role = profile?.role ?? "pending";
  const home = ROLE_HOME[role] ?? "/pending";

  // API routes handle their own auth/role checks internally (every route.ts
  // calls supabase.auth.getUser() + checks profile.role itself) and must
  // never receive a page redirect — a fetch() silently follows redirects
  // and returns the redirected page's HTML with a 200 status, so the caller
  // has no way to detect that its request never reached the intended route.
  // This previously broke onboarding "skip" (its own completion POST got
  // redirected back to /onboarding) and could affect any other API call
  // made before onboarding completes or while a role is "pending".
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  // Root → role home
  if (pathname === "/") {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Redirect authenticated users away from auth pages to their dashboard
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Onboarding gate: owners and admins must complete onboarding before
  // accessing their dashboards. Added after the existing redirect logic so it
  // does not interfere with auth/role routing above.
  if (
    (role === "owner" || role === "admin") &&
    profile?.onboarding_complete === false &&
    !pathname.startsWith("/onboarding")
  ) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Pending users can only access /pending (API routes already excluded above)
  if (role === "pending") {
    if (!pathname.startsWith("/pending")) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
    return supabaseResponse;
  }

  // Admins can view any role's dashboard (View As feature)
  if (role === "admin") {
    return supabaseResponse;
  }

  // Block cross-role dashboard access for non-admins
  const dashboardRoles = ["admin", "owner", "employee"];
  for (const r of dashboardRoles) {
    if (pathname.startsWith(`/${r}`) && r !== role) {
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
