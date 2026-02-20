import auth from "@lib/auth.js";
import * as todoService from "@services/todoService.js";
const db: any = require("@lib/prisma.js").default || require("@lib/prisma.js");
import { NextRequest, NextResponse } from "next/server";
import { generateTodosAllocation } from "./todoAllocator";

function getTokenFromHeaders(req: NextRequest) {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/sessionToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
}

type ShapedTask = {
    id: string;
    title: string;
    total_time_needed_seconds: number;
    total_time_used_seconds: number;
    priority: string;
    recurring: boolean;
};

export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const sprintId = body.sprint_id || body.sprintId;
        const taskIds = Array.isArray(body.task_ids || body.taskIds) ? (body.task_ids || body.taskIds) : [];
        const allocatedSeconds = Number(body.allocated_time_today) || Number(body.allocated_time_today_seconds) || 0;

        if (!sprintId) return NextResponse.json({ error: "sprint_id is required" }, { status: 400 });
        if (!taskIds.length) return NextResponse.json({ error: "task_ids required" }, { status: 400 });
        if (allocatedSeconds <= 0) return NextResponse.json({ error: "allocated_time_today must be > 0" }, { status: 400 });

        // Load task details
        const tasks = await db.task.findMany({ where: { id: { in: taskIds } } });

        // Load sessions for those tasks and sum durations per task (use sessions as source of truth for time used)
        const sessions = await db.session.findMany({ where: { taskId: { in: taskIds } }, select: { taskId: true, duration: true } });
        const usedByTask: Record<string, number> = {};
        for (const s of sessions) {
            const tid = s.taskId;
            const dur = Number(s.duration || 0);
            usedByTask[tid] = (usedByTask[tid] || 0) + dur;
        }

        // load sprint to compute days left (used for recurring allocation)
        const sprintRow = await db.sprint.findUnique({ where: { id: sprintId } });
        let daysLeft = 1;
        if (sprintRow) {
            const endStr = sprintRow.dateEnded || sprintRow.dateExpectedToEnd || null;
            if (endStr) {
                const end = Date.parse(endStr);
                if (!Number.isNaN(end)) {
                    const now = Date.now();
                    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
                    daysLeft = Math.max(1, diffDays);
                }
            }
        }



        const shaped: ShapedTask[] = tasks.map((t: any) => ({
            id: t.id,
            title: t.title || t.name || `Task ${t.id}`,
            total_time_needed_seconds: Number(t.plannedTime) || 0,
            // derive total used seconds from session durations (source of truth)
            total_time_used_seconds: Number(usedByTask[t.id] || 0),
            priority: t.priority || "high",
            recurring: !!t.recurring,
        }));

        const created: any[] = [];

        const allocResp = generateTodosAllocation(shaped, Number(allocatedSeconds), daysLeft);
        const allocations = allocResp.allocations

        for (const a of allocations) {
            const taskRow = tasks.find((tt: any) => tt.id === a.id) || {};
            const title = taskRow.title || taskRow.name || `Work on ${a.id}`;
            const plannedHours = Math.round(((a.time_allocated_seconds || 0) / 3600) * 100) / 100;
            const dueDate = new Date().toISOString().slice(0, 10);

            const todoRow = await todoService.createTodo({
                sprintId,
                taskId: a.id,
                title,
                dueDate,
                plannedHours,
                priority: a.priority,
            }, user.id);

            created.push(todoRow);
        }

        return NextResponse.json({ created });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
