import { NextResponse } from "next/server";
const prisma = require("../../../lib/prisma.js");
const auth = require("../../../lib/auth.js");

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

        const user = await auth.createUser({ name, email, password });
        const session = await auth.createSession(user.id);

        const res = NextResponse.json({ id: user.id, email: user.email });
        res.cookies.set("sessionToken", session.token, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: process.env.NODE_ENV === "production",
        });
        return res;
    } catch (err: any) {
        const msg = String(err?.message || err);
        const status = msg.includes("already registered") ? 409 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}
