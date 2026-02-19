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

type Task = {
    id: string;
    title: string;
    total_time_needed_seconds: number;
    total_time_used_seconds: number;
    priority: string;
    recurring: boolean;
};

type Allocation = {
    id: string;
    priority: string;
    score: number;
    time_allocated_seconds: number;
};

function generateDailyTodos(tasks: Task[], dailySeconds: number, daysLeft: number): Allocation[] {
    if (!Array.isArray(tasks) || tasks.length === 0 || dailySeconds <= 0) return [];

    const SLOT_SECONDS = 300; // 5 minutes
    const SLOT_HOURS = SLOT_SECONDS / 3600;

    const allocationsMap: Record<string, number> = {};
    let remainingBudgetSeconds = Math.max(0, Number(dailySeconds));

    // Recurring-first allocation
    const recurring = tasks.filter((t) => t.recurring && (t.total_time_needed_seconds - t.total_time_used_seconds) > 0);
    if (recurring.length > 0 && remainingBudgetSeconds > 0) {
        const allocatedHours = remainingBudgetSeconds / 3600;
        const infos = recurring.map((t) => {
            const remSec = Math.max(0, t.total_time_needed_seconds - t.total_time_used_seconds);
            return { id: t.id, remSec, remHours: remSec / 3600, priority: t.priority };
        });
        const totalNeed = infos.reduce((s, i) => s + i.remHours, 0);

        if (totalNeed <= allocatedHours) {
            // give full need (rounded to slots)
            for (const i of infos) {
                const give = Math.min(remainingBudgetSeconds, Math.round(i.remSec / SLOT_SECONDS) * SLOT_SECONDS);
                if (give <= 0) continue;
                allocationsMap[i.id] = (allocationsMap[i.id] || 0) + give;
                remainingBudgetSeconds = Math.max(0, remainingBudgetSeconds - give);
            }
        } else {
            // per-day suggestion capped at half of today's allocation, fallback to equal split + round-robin leftover
            const per = infos.map((it) => {
                const raw = daysLeft > 0 ? it.remHours / Math.max(1, daysLeft) : it.remHours;
                const capped = Math.min(raw, allocatedHours / 2);
                return { ...it, raw, capped };
            });

            const sum = per.reduce((s, p) => s + p.capped, 0);
            const perFinal: Record<string, number> = {};

            if (sum <= allocatedHours) {
                per.forEach((p) => (perFinal[p.id] = p.capped));
            } else {
                const equal = allocatedHours / recurring.length;
                let leftoverHours = 0;
                recurring.forEach((t) => {
                    const want = Math.min(equal, Math.max(0, (t.total_time_needed_seconds - t.total_time_used_seconds) / 3600));
                    perFinal[t.id] = want;
                    leftoverHours += Math.max(0, equal - want);
                });

                if (leftoverHours > 0) {
                    const slots = Math.round((leftoverHours * 3600) / SLOT_SECONDS);
                    let idx = 0;
                    const candidates = recurring.filter((t) => (perFinal[t.id] * 3600) < (t.total_time_needed_seconds - t.total_time_used_seconds));
                    for (let i = 0; i < slots && candidates.length > 0; i++) {
                        const t = candidates[idx % candidates.length];
                        perFinal[t.id] = (perFinal[t.id] || 0) + SLOT_HOURS;
                        if ((perFinal[t.id] * 3600) >= (t.total_time_needed_seconds - t.total_time_used_seconds)) {
                            const rem = candidates.findIndex((c) => c.id === t.id);
                            if (rem >= 0) candidates.splice(rem, 1);
                        }
                        idx++;
                    }
                }
            }

            // apply perFinal as slot-rounded seconds
            for (const id of Object.keys(perFinal)) {
                const hours = perFinal[id] || 0;
                const secs = Math.round((hours * 3600) / SLOT_SECONDS) * SLOT_SECONDS;
                if (secs <= 0) continue;
                allocationsMap[id] = (allocationsMap[id] || 0) + secs;
                remainingBudgetSeconds = Math.max(0, remainingBudgetSeconds - secs);
            }
        }
    }

    // Greedy allocation for non-recurring tasks
    const remainingTasks = tasks.filter((t) => !t.recurring && (t.total_time_needed_seconds - t.total_time_used_seconds) > 0);
    if (remainingTasks.length > 0 && remainingBudgetSeconds > 0) {
        const scored = remainingTasks
            .map((t) => {
                const totalNeeded = Number(t.total_time_needed_seconds || 0);
                const totalUsed = Number(t.total_time_used_seconds || 0);
                const remSec = Math.max(0, totalNeeded - totalUsed);
                if (remSec <= 0) return null;
                const remHours = remSec / 3600;
                const progress = totalNeeded > 0 ? totalUsed / totalNeeded : 0;
                let score = (PRIORITY_WEIGHT as any)[t.priority] || 1;
                if (totalUsed === 0) score += 2;
                if (progress > 0.7) score += 1.5;
                return { ...t, remSec, remHours, score };
            })
            .filter(Boolean) as (Task & { remSec: number; remHours: number; score: number })[];

        if (scored.length > 0) {
            scored.sort((a, b) => b.score - a.score);
            let remainingDayHours = remainingBudgetSeconds / 3600;
            const MAX_SINGLE = scored.length <= 2 ? remainingDayHours : remainingDayHours / 2;
            const MIN_PER_TASK_HOURS = 1;
            const allocHours: Record<string, number> = {};

            for (const task of scored) {
                if (remainingDayHours <= 0) break;
                const cap = Math.min(MAX_SINGLE, remainingDayHours);
                const desiredRaw = Math.min(task.remHours, cap);
                let desiredRounded = Math.round(desiredRaw / SLOT_HOURS) * SLOT_HOURS;
                if (remainingDayHours >= MIN_PER_TASK_HOURS) {
                    desiredRounded = Math.max(MIN_PER_TASK_HOURS, desiredRounded);
                }
                const finalAlloc = Math.max(0, Math.min(task.remHours, desiredRounded, remainingDayHours));
                if (finalAlloc <= 0) {
                    allocHours[task.id] = 0;
                    continue;
                }
                allocHours[task.id] = finalAlloc;
                remainingDayHours -= finalAlloc;
            }

            // convert to seconds
            for (const task of scored) {
                const hours = allocHours[task.id] || 0;
                if (hours > 0) {
                    const secs = Math.round((hours * 3600) / SLOT_SECONDS) * SLOT_SECONDS;
                    if (secs <= 0) continue;
                    allocationsMap[task.id] = (allocationsMap[task.id] || 0) + secs;
                    remainingBudgetSeconds = Math.max(0, remainingBudgetSeconds - secs);
                }
            }

            // distribute leftover in SLOT increments round-robin
            let leftoverHours = remainingDayHours;
            if (leftoverHours >= SLOT_HOURS) {
                const allocCopy = { ...allocHours };
                let progress = true;
                while (leftoverHours >= SLOT_HOURS && progress) {
                    progress = false;
                    for (const task of scored) {
                        if (leftoverHours < SLOT_HOURS) break;
                        const already = allocCopy[task.id] || 0;
                        const canTake = Math.max(0, task.remHours - already);
                        if (canTake >= SLOT_HOURS) {
                            allocCopy[task.id] = already + SLOT_HOURS;
                            allocationsMap[task.id] = (allocationsMap[task.id] || 0) + SLOT_SECONDS;
                            leftoverHours -= SLOT_HOURS;
                            progress = true;
                        }
                    }
                }
            }
        }
    }

    // If we still have remaining budget, distribute SLOT_SECONDS to any task with capacity
    const totalAllocatedSoFar = Object.values(allocationsMap).reduce((s, v) => s + v, 0);
    let remainingToFill = Math.max(0, Number(dailySeconds) - totalAllocatedSoFar);
    if (remainingToFill >= SLOT_SECONDS) {
        const candidates = tasks.filter((t) => (t.total_time_needed_seconds - t.total_time_used_seconds) > (allocationsMap[t.id] || 0));
        let idx = 0;
        while (remainingToFill >= SLOT_SECONDS && candidates.length > 0) {
            const c = candidates[idx % candidates.length];
            const canRemain = Math.max(0, c.total_time_needed_seconds - c.total_time_used_seconds - (allocationsMap[c.id] || 0));
            if (canRemain >= SLOT_SECONDS) {
                allocationsMap[c.id] = (allocationsMap[c.id] || 0) + SLOT_SECONDS;
                remainingToFill -= SLOT_SECONDS;
            } else {
                const rem = candidates.findIndex((x) => x.id === c.id);
                if (rem >= 0) candidates.splice(rem, 1);
            }
            idx++;
        }
    }

    // Preferred intervals helpers
    const allowedMins = [0, 5, 15, 30, 45, 60];
    function floorToPreferred(seconds: number) {
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const rem = minutes % 60;
        let pick = 0;
        for (let i = allowedMins.length - 1; i >= 0; i--) {
            if (allowedMins[i] <= rem) {
                pick = allowedMins[i];
                break;
            }
        }
        let newMinutes = hours * 60 + (pick === 60 ? 0 : pick);
        if (pick === 60) newMinutes = (hours + 1) * 60;
        return newMinutes * 60;
    }
    function nextPreferred(seconds: number) {
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const rem = minutes % 60;
        for (const a of allowedMins) {
            if (a > rem) {
                let newMinutes = hours * 60 + (a === 60 ? 0 : a);
                if (a === 60) newMinutes = (hours + 1) * 60;
                return newMinutes * 60;
            }
        }
        return (hours + 1) * 3600;
    }

    // Floor allocations and then try to greedily upgrade to consume budget
    const floored: Record<string, number> = {};
    let sumFloored = 0;
    for (const id of Object.keys(allocationsMap)) {
        const secs = allocationsMap[id] || 0;
        const f = floorToPreferred(secs);
        if (f <= 0) continue;
        floored[id] = f;
        sumFloored += f;
    }

    let remainingForUpgrade = Math.max(0, Number(dailySeconds) - sumFloored);
    if (remainingForUpgrade > 0) {
        const scoredOrder = Object.keys(floored).map((id) => {
            const t = tasks.find((x) => x.id === id) as Task | undefined;
            const score = (t && ((PRIORITY_WEIGHT as any)[t.priority] || 1)) || 1;
            return { id, score };
        }).sort((a, b) => b.score - a.score);

        let progress = true;
        while (remainingForUpgrade >= SLOT_SECONDS && progress) {
            progress = false;
            for (const s of scoredOrder) {
                if (remainingForUpgrade < SLOT_SECONDS) break;
                const id = s.id;
                const current = floored[id] || 0;
                const next = nextPreferred(current);
                const delta = next - current;
                if (delta <= 0) continue;
                const task = tasks.find((x) => x.id === id);
                const remainingNeed = task ? Math.max(0, task.total_time_needed_seconds - task.total_time_used_seconds) : Infinity;
                if (next > remainingNeed) continue;
                if (delta <= remainingForUpgrade) {
                    floored[id] = next;
                    remainingForUpgrade -= delta;
                    sumFloored += delta;
                    progress = true;
                }
            }
            if (!progress) break;
        }
    }

    // If still leftover seconds, distribute in SLOT_SECONDS increments
    const totalAllocated = Object.values(floored).reduce((s, v) => s + v, 0);
    let remainingSecs = Math.max(0, Number(dailySeconds) - totalAllocated);
    if (remainingSecs > 0) {
        const candidates = Object.keys(floored).filter((id) => {
            const task = tasks.find((x) => x.id === id);
            const remainingNeed = task ? Math.max(0, task.total_time_needed_seconds - task.total_time_used_seconds) : 0;
            return (floored[id] || 0) < remainingNeed;
        });
        let idx = 0;
        while (remainingSecs >= SLOT_SECONDS && candidates.length > 0) {
            const id = candidates[idx % candidates.length];
            const task = tasks.find((x) => x.id === id)!;
            const current = floored[id] || 0;
            const remainingNeed = Math.max(0, task.total_time_needed_seconds - task.total_time_used_seconds);
            if (current + SLOT_SECONDS <= remainingNeed) {
                floored[id] = current + SLOT_SECONDS;
                remainingSecs -= SLOT_SECONDS;
            } else {
                const remIdx = candidates.indexOf(id);
                if (remIdx >= 0) candidates.splice(remIdx, 1);
                if (candidates.length === 0) break;
                continue;
            }
            idx++;
        }
    }

    // Finalize allocations
    const result: Allocation[] = [];
    for (const id of Object.keys(floored)) {
        const seconds = floored[id] || 0;
        if (seconds <= 0) continue;
        const t = tasks.find((x) => x.id === id) as Task | undefined;
        result.push({ id, priority: (t && t.priority) || "high", score: 0, time_allocated_seconds: seconds });
    }

    return result;
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

        type ShapedTask = {
            id: string;
            title: string;
            total_time_needed_seconds: number;
            total_time_used_seconds: number;
            priority: string;
            recurring: boolean;
        };

        const shaped: ShapedTask[] = tasks.map((t: any) => ({
            id: t.id,
            title: t.title || t.name || `Task ${t.id}`,
            total_time_needed_seconds: Number(t.plannedTime) || 0,
            total_time_used_seconds: Number(t.timeActuallySpent || t.timeSpent || 0) || 0,
            priority: t.priority || "high",
            recurring: !!t.recurring,
        }));

        const created: any[] = [];

        const allocations = generateDailyTodos(shaped, Number(allocatedSeconds), daysLeft);

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
