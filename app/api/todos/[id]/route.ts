import { getParamFromUrl } from "@lib/routeUtils.js";
import auth from "@lib/auth.js";
import * as todoService from "@services/todoService.js";
import { NextRequest, NextResponse } from "next/server";

function getTokenFromHeaders(req: NextRequest) {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/sessionToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(req, "todos");
        const todo = await todoService.getTodo(id, user.id);
        if (!todo) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(todo);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 400 });
    }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(req, "todos");
        const updated = await todoService.updateTodo(id, body, user.id);
        return NextResponse.json(updated);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const p = await ctx.params;
        const id = p?.id || getParamFromUrl(req, "todos");
        await todoService.deleteTodo(id, user.id);
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 400 });
    }
}
