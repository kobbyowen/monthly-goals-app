import { getParamFromUrl } from "@lib/routeUtils.js";
import auth from "@lib/auth.js";
import * as todoService from "@services/todoService.js";
import { NextRequest, NextResponse } from "next/server";

function getTokenFromHeaders(req: NextRequest) {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/sessionToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
}

function parseOptionalBoolean(value: string | null) {
    if (value === null) return undefined;
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const p = await ctx.params;
        const taskId = p?.id || getParamFromUrl(req, "tasks");

        const search = req.nextUrl.searchParams;
        const fromDate = search.get("from") || search.get("fromDate");
        const toDate = search.get("to") || search.get("toDate");
        const status = search.get("status") || undefined;
        const completed = parseOptionalBoolean(search.get("completed"));

        const result = await todoService.listTodos(
            { fromDate, toDate, taskId, status, completed },
            user.id,
        );
        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 400 });
    }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const p = await ctx.params;
        const taskId = p?.id || getParamFromUrl(req, "tasks");

        const created = await todoService.createTodo({ ...body, taskId }, user.id);
        return NextResponse.json(created, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 400 });
    }
}
