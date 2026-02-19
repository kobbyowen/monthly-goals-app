import auth from "@lib/auth.js";
import * as todoService from "@services/todoService.js";
const db: any = require("@lib/prisma.js").default || require("@lib/prisma.js");
import { NextRequest, NextResponse } from "next/server";

function getTokenFromHeaders(req: NextRequest) {
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/sessionToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : undefined;
}

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };

function generateDailyTodos(tasks: any[], dailySeconds: number): any[] {
    if (!Array.isArray(tasks) || tasks.length === 0 || dailySeconds <= 0) return [];

    const scored = tasks
        .map((t: any) => {
            const remaining = Math.max(0, (t.total_time_needed_seconds || 0) - (t.total_time_used_seconds || 0));
            if (remaining <= 0) return null;
            const progress = (t.total_time_used_seconds || 0) / (t.total_time_needed_seconds || 1);
            let score = (PRIORITY_WEIGHT as any)[t.priority] || 1;
            if ((t.total_time_used_seconds || 0) === 0) score += 2; // starvation protection
            if (progress > 0.7) score += 1.5; // near completion bonus
            return { ...t, remaining, score };
        })
        .filter(Boolean);

    if (scored.length === 0) return [];

    scored.sort((a, b) => b.score - a.score);

    // Distribute dailySeconds across tasks proportionally to their score,
    // but ensure every task gets at least an even minimum share so we don't
    // assign the entire day to a single top-scored task.
    const todos: any[] = [];
    let remainingDay = dailySeconds;

    const totalScore = scored.reduce((s: number, t: any) => s + (t.score || 0), 0) || scored.length;
    const minShare = Math.max(1, Math.floor(dailySeconds / scored.length));

    // First pass: give each task a proportional (or minimum) share, capped by its remaining need
    const allocations: Record<string, number> = {};
    for (const task of scored) {
        if (remainingDay <= 0) break;
        const proportion = Math.round((task.score / totalScore) * dailySeconds);
        const desired = Math.max(minShare, proportion);
        const alloc = Math.min(task.remaining, desired, remainingDay);
        if (alloc <= 0) {
            allocations[task.id] = 0;
            continue;
        }
        allocations[task.id] = alloc;
        remainingDay -= alloc;
    }

    // Second pass: if we still have time left, distribute one-second increments to tasks
    // that can accept more, iterating in score order until we exhaust remainingDay.
    if (remainingDay > 0) {
        for (const task of scored) {
            if (remainingDay <= 0) break;
            const already = allocations[task.id] || 0;
            const canTake = Math.max(0, task.remaining - already);
            if (canTake <= 0) continue;
            const give = Math.min(canTake, remainingDay);
            allocations[task.id] = already + give;
            remainingDay -= give;
        }
    }

    // Build result preserving score and priority
    for (const task of scored) {
        const time_allocated_seconds = allocations[task.id] || 0;
        if (time_allocated_seconds > 0) {
            todos.push({ id: task.id, priority: task.priority || "high", score: Number((task.score || 0).toFixed(2)), time_allocated_seconds });
        }
    }

    return todos;
}

export async function POST(req: NextRequest) {
    try {
        const token = getTokenFromHeaders(req);
        const user = await auth.getUserFromToken(token);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const sprintId = body.sprint_id || body.sprintId;
        const epicId = body.epic_id || body.epicId;
        const taskIds = Array.isArray(body.task_ids || body.taskIds) ? (body.task_ids || body.taskIds) : [];
        const allocatedSeconds = Number(body.allocated_time_today) || Number(body.allocated_time_today_seconds) || 0;

        if (!sprintId) return NextResponse.json({ error: "sprint_id is required" }, { status: 400 });
        if (!taskIds.length) return NextResponse.json({ error: "task_ids required" }, { status: 400 });
        if (allocatedSeconds <= 0) return NextResponse.json({ error: "allocated_time_today must be > 0" }, { status: 400 });

        // Load task details
        const tasks = await db.task.findMany({ where: { id: { in: taskIds } } });

        // Map tasks into algorithm shape
        const shaped = tasks.map((t: any) => ({
            id: t.id,
            title: t.title || t.name || `Task ${t.id}`,
            // interpret plannedTime as hours (fallback 0) -> convert to seconds
            total_time_needed_seconds: (Number(t.plannedTime) || 0) * 3600,
            // use timeActuallySpent if present (assumed seconds), fallback to timeSpent
            total_time_used_seconds: Number(t.timeActuallySpent || t.timeSpent || 0) || 0,
            priority: "high",
        }));

        // If some ids not found, they will be ignored

        const allocations = generateDailyTodos(shaped, Number(allocatedSeconds));

        const created = [];
        for (const a of allocations) {
            // create a todo per allocation
            // prefer the DB task's name/title when available
            const taskRow = tasks.find((tt: any) => tt.id === a.id) || {};
            const title = taskRow.title || taskRow.name || a.name || a.title || `Work on ${a.id}`;
            const plannedHours = (a.time_allocated_seconds || 0) / 3600;
            const dueDate = new Date().toISOString().slice(0, 10); // today

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
