import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/register", "/pending", "/api/auth"];

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  owner: "/owner",
  employee: "/employee",
  client: "/client",
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "pending";
  const home = ROLE_HOME[role] ?? "/pending";

  // Root → role home
  if (pathname === "/") {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Redirect authenticated users away from auth pages to their dashboard
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Pending users can only access /pending
  if (role === "pending") {
    if (!pathname.startsWith("/pending") && !pathname.startsWith("/api/auth")) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
    return supabaseResponse;
  }

  // Admins can view any role's dashboard (View As feature)
  if (role === "admin") {
    return supabaseResponse;
  }

  // Block cross-role dashboard access for non-admins
  const dashboardRoles = ["admin", "owner", "employee", "client"];
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
