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

export async function GET(req: NextRequest) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const search = req.nextUrl.searchParams;
        const fromDate = search.get("from") || search.get("fromDate");
        const toDate = search.get("to") || search.get("toDate");
        const sprintId = search.get("sprintId") || undefined;
        const taskId = search.get("taskId") || undefined;
        const status = search.get("status") || undefined;
        const completed = parseOptionalBoolean(search.get("completed"));

        const result = await todoService.listTodos(
            { fromDate, toDate, sprintId, taskId, status, completed },
            user.id,
        );

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 400 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const created = await todoService.createTodo(body, user.id);
        return NextResponse.json(created, { status: 201 });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 400 });
    }
}
