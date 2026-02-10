import { withBase } from "@/app/lib/api";
import { NextResponse } from "next/server";
import auth from "../../../lib/auth.js";

export async function POST(req: Request) {
    try {
        const cookie = req.headers.get("cookie") || "";
        const match = cookie.match(/sessionToken=([^;]+)/);
        const token = match ? decodeURIComponent(match[1]) : undefined;
        if (token) {
            await auth.deleteSessionByToken(token);
        }
        const res = NextResponse.json({ ok: true });
        res.cookies.set("sessionToken", "", {
            httpOnly: true,
            sameSite: "lax",
            path: withBase("/"),
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
        });
        return res;
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
