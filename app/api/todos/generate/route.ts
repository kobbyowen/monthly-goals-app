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

    // Convert inputs from seconds -> hours for algorithm clarity
    const dailyHours = dailySeconds / 3600;

    const scored = tasks
        .map((t: any) => {
            const totalNeededSec = Number(t.total_time_needed_seconds || 0);
            const totalUsedSec = Number(t.total_time_used_seconds || 0);
            const remainingSec = Math.max(0, totalNeededSec - totalUsedSec);
            if (remainingSec <= 0) return null;

            const remaining = remainingSec / 3600; // hours
            const progress = totalNeededSec > 0 ? totalUsedSec / totalNeededSec : 0;
            let score = (PRIORITY_WEIGHT as any)[t.priority] || 1;
            if (totalUsedSec === 0) score += 2; // starvation protection
            if (progress > 0.7) score += 1.5; // near completion bonus
            return { ...t, remainingHours: remaining, remainingSec, score };
        })
        .filter(Boolean);

    if (scored.length === 0) return [];

    scored.sort((a, b) => b.score - a.score);

    // Use the user's algorithm: greedy per-score allocation in hours with a
    // per-task cap (MAX_SINGLE). We'll round allocations to 5-minute slots and
    // enforce a minimum of 1 hour when budget allows.
    const MAX_SINGLE = scored.length <= 2 ? dailyHours : dailyHours / 2;
    const SLOT_HOURS = 300 / 3600; // 5 minutes in hours (0.083333...)
    const MIN_PER_TASK_HOURS = 1; // 1 hour

    let remainingDayHours = dailyHours;
    const allocationsHours: Record<string, number> = {};

    for (const task of scored) {
        if (remainingDayHours <= 0) break;

        const cap = Math.min(MAX_SINGLE, remainingDayHours);
        const desiredRaw = Math.min(task.remainingHours, cap);

        // Round to nearest 5-minute slot
        let desiredRounded = Math.round(desiredRaw / SLOT_HOURS) * SLOT_HOURS;

        // If we still have at least one hour left in the day's budget, promote
        // this allocation to at least 1 hour to meet the minimum requirement.
        if (remainingDayHours >= MIN_PER_TASK_HOURS) {
            desiredRounded = Math.max(MIN_PER_TASK_HOURS, desiredRounded);
        }

        // Ensure we don't exceed what the task needs or the day's remaining hours
        const finalAllocHours = Math.max(0, Math.min(task.remainingHours, desiredRounded, remainingDayHours));
        if (finalAllocHours <= 0) {
            allocationsHours[task.id] = 0;
            continue;
        }

        allocationsHours[task.id] = finalAllocHours;
        remainingDayHours -= finalAllocHours;
    }

    // Convert allocations back to seconds and build result
    const todos: any[] = [];
    for (const task of scored) {
        const hours = allocationsHours[task.id] || 0;
        if (hours > 0) {
            // Convert hours -> seconds, ensure multiple of SLOT (300s)
            const seconds = Math.round(hours * 3600 / 300) * 300;
            if (seconds <= 0) continue;
            todos.push({ id: task.id, priority: task.priority || "high", score: Number((task.score || 0).toFixed(2)), time_allocated_seconds: seconds });
        }
    }

    // If there's still leftover hours (due to rounding or caps), distribute
    // remaining time in SLOT increments in priority order (round-robin) to
    // tasks that still have remaining capacity.
    let leftoverHours = remainingDayHours;
    if (leftoverHours >= SLOT_HOURS) {
        // Work on a copy of allocationsHours so we can modify
        const alloc = { ...allocationsHours };
        // Continue distributing in round-robin until no progress
        let progress = true;
        while (leftoverHours >= SLOT_HOURS && progress) {
            progress = false;
            for (const task of scored) {
                if (leftoverHours < SLOT_HOURS) break;
                const already = alloc[task.id] || 0;
                const canTake = Math.max(0, task.remainingHours - already);
                if (canTake >= SLOT_HOURS) {
                    alloc[task.id] = already + SLOT_HOURS;
                    leftoverHours -= SLOT_HOURS;
                    progress = true;
                }
            }
        }

        // Merge back alloc into todos results (add any newly allocated amounts)
        for (const task of scored) {
            const originalHours = allocationsHours[task.id] || 0;
            const newHours = alloc[task.id] || 0;
            const added = Math.max(0, newHours - originalHours);
            if (added > 0) {
                const seconds = Math.round(added * 3600 / 300) * 300;
                if (seconds > 0) {
                    // find existing todo entry and add seconds, or push new
                    const existing = todos.find((t) => t.id === task.id);
                    if (existing) existing.time_allocated_seconds += seconds;
                    else todos.push({ id: task.id, priority: task.priority || "high", score: Number((task.score || 0).toFixed(2)), time_allocated_seconds: seconds });
                }
            }
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
            // interpret plannedTime as seconds (fallback 0)
            total_time_needed_seconds: Number(t.plannedTime) || 0,
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
