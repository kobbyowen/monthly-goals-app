import { NextRequest, NextResponse } from "next/server";
import { basePath as configuredBasePath } from "./basePath";

const PUBLIC_PATHS = [
    "/auth/login",
    "/auth/register",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const basePath = configuredBasePath

    // Compute a path relative to basePath so PUBLIC_PATHS can be matched
    const relativePath = basePath && pathname.startsWith(basePath)
        ? pathname.slice(basePath.length) || "/"
        : pathname;

    // If a basePath is configured, redirect only root '/' to the basePath
    // (useful for local/dev access). Do NOT rewrite every incoming URL;
    // that causes asset and route lookups to fail.
    if (basePath && pathname === "/") {
        const redirect = req.nextUrl.clone();
        redirect.pathname = `${basePath}/`;
        return NextResponse.redirect(redirect);
    }

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
        if (pathname.includes("/api/")) {
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
