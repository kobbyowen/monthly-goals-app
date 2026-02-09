import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
    "/auth/login",
    "/auth/register",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const basePath = (req.nextUrl && (req.nextUrl as any).basePath) || "";
    // Compute a path relative to basePath so PUBLIC_PATHS can be matched
    const relativePath = basePath && pathname.startsWith(basePath)
        ? pathname.slice(basePath.length) || "/"
        : pathname;

    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon.ico") ||
        pathname.startsWith("/public")
    ) {
        return NextResponse.next();
    }

    if (PUBLIC_PATHS.some((p) => relativePath.startsWith(p))) {
        return NextResponse.next();
    }

    const sessionToken = req.cookies.get("sessionToken")?.value;
    if (!sessionToken) {
        if (pathname.startsWith("/api")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const loginUrl = req.nextUrl.clone();
        // place login under basePath (if any) so redirects keep subpath context
        loginUrl.pathname = `${basePath || ""}/auth/login`;
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/(.*)"],
};
