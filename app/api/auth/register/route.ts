import prisma from '@lib/prisma.js';
import auth from '@lib/auth.js';
import { withBase } from "@/app/lib/api";
import { NextResponse } from "next/server";



export async function POST(req: Request) {
    try {
        const body = await req.json();
        const name = (body.name || "").trim();
        const email = (body.email || "").toLowerCase().trim();
        const password = body.password || "";

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 },
            );
        }
        if (!name) {
            return NextResponse.json({ error: "Full name is required" }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        const user = await auth.createUser({ name, email, password });
        const session = await auth.createSession(user.id);

        const res = NextResponse.json({ id: user.id, email: user.email });
        res.cookies.set("sessionToken", session.token, {
            httpOnly: true,
            sameSite: "lax",
            path: withBase("/"),
            secure: process.env.NODE_ENV === "production",
        });
        return res;
    } catch (err: any) {
        const msg = String(err?.message || err);
        const status = msg.includes("already registered") ? 409 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}
