import { withBase } from "@/app/lib/api";
import { NextResponse } from "next/server";
const auth = require("../../../lib/auth.js");

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const email = (body.email || "").toLowerCase().trim();
        const password = body.password || "";

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 },
            );
        }

        const user = await auth.getUserByCredentials(email, password);
        if (!user) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        const session = await auth.createSession(user.id);
        const res = NextResponse.json({ id: user.id, email: user.email });
        res.cookies.set("sessionToken", session.token, {
            httpOnly: true,
            sameSite: "lax",
            path: withBase("/"),
            secure: process.env.NODE_ENV === "production",
        });
        return res;
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
