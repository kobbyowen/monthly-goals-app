import { Epic as ApiEpic } from '../lib/api/types';
import { Epic, Sprint, Task, Session, ChecklistItem, ID } from './types';

type Normalized = {
    epics: Epic[];
    sprints: Sprint[];
    tasks: Task[];
    sessions: Session[];
    checklists: ChecklistItem[];
};

export function normalizeApiEpics(apiEpics: ApiEpic[]): Normalized {
    const epics: Epic[] = [];
    const sprints: Sprint[] = [];
    const tasks: Task[] = [];
    const sessions: Session[] = [];
    const checklists: ChecklistItem[] = [];

    for (const aEpic of apiEpics) {
        const epicSprintIds: ID[] = [];
        const epicTaskIds: ID[] = [];

        // top-level tasks attached directly to epic
        if (Array.isArray(aEpic.tasks)) {
            for (const t of aEpic.tasks) {
                const taskId = t.id;
                epicTaskIds.push(taskId);

                // normalize sessions
                const sessionIds: ID[] = [];
                if (Array.isArray(t.sessions)) {
                    for (const s of t.sessions) {
                        sessionIds.push(s.id);
                        sessions.push({
                            id: s.id,
                            taskId: s.taskId,
                            startedAt: s.startedAt,
                            endedAt: s.endedAt ?? null,
                            seconds: s.seconds ?? s.duration ?? undefined,
                            createdAt: s.createdAt ?? undefined,
                            updatedAt: s.updatedAt ?? undefined,
                        });
                    }
                }

                // normalize checklists
                const checklistIds: ID[] = [];
                if (Array.isArray(t.checklists)) {
                    for (const c of t.checklists) {
                        checklistIds.push(c.id);
                        checklists.push({
                            id: c.id,
                            taskId: c.taskId,
                            title: c.title,
                            done: c.completed ?? c.done ?? false,
                            position: c.position ?? undefined,
                            createdAt: c.createdAt ?? undefined,
                            updatedAt: c.updatedAt ?? undefined,
                        });
                    }
                }

                tasks.push({
                    id: t.id,
                    sprintId: t.sprintId ?? null,
                    epicId: null,
                    name: t.name ?? t.title,
                    description: t.description ?? null,
                    completed: t.completed ?? false,
                    plannedTime: t.plannedTime ?? t.estimate ?? null,
                    sessionIds,
                    checklistIds,
                    position: t.position ?? undefined,
                    createdAt: t.createdAt ?? undefined,
                    updatedAt: t.updatedAt ?? undefined,
                });
            }
        }

        // sprints
        if (Array.isArray(aEpic.sprints)) {
            for (const s of aEpic.sprints) {
                epicSprintIds.push(s.id);
                const sprintTaskIds: ID[] = [];
                if (Array.isArray(s.tasks)) {
                    for (const t of s.tasks) {
                        sprintTaskIds.push(t.id);
                        epicTaskIds.push(t.id);

                        // sessions within sprint->task
                        const sessionIds: ID[] = [];
                        if (Array.isArray(t.sessions)) {
                            for (const ss of t.sessions) {
                                sessionIds.push(ss.id);
                                sessions.push({
                                    id: ss.id,
                                    taskId: ss.taskId,
                                    startedAt: ss.startedAt,
                                    endedAt: ss.endedAt ?? null,
                                    seconds: ss.seconds ?? ss.duration ?? undefined,
                                    createdAt: ss.createdAt ?? undefined,
                                    updatedAt: ss.updatedAt ?? undefined,
                                });
                            }
                        }

                        // checklists within sprint->task
                        const checklistIds: ID[] = [];
                        if (Array.isArray(t.checklists)) {
                            for (const c of t.checklists) {
                                checklistIds.push(c.id);
                                checklists.push({
                                    id: c.id,
                                    taskId: c.taskId,
                                    title: c.title,
                                    done: c.completed ?? c.done ?? false,
                                    position: c.position ?? undefined,
                                    createdAt: c.createdAt ?? undefined,
                                    updatedAt: c.updatedAt ?? undefined,
                                });
                            }
                        }

                        tasks.push({
                            id: t.id,
                            sprintId: t.sprintId ?? s.id,
                            epicId: s.epicId ?? aEpic.id,
                            name: t.name ?? t.title,
                            description: t.description ?? null,
                            completed: t.completed ?? false,
                            plannedTime: t.plannedTime ?? t.estimate ?? null,
                            sessionIds,
                            checklistIds,
                            position: t.position ?? undefined,
                            createdAt: t.createdAt ?? undefined,
                            updatedAt: t.updatedAt ?? undefined,
                        });
                    }
                }

                // determine weekOfMonth (preserve if provided, otherwise try to parse from name)
                let weekOfMonth: number | undefined = undefined;
                if (typeof (s as any).weekOfMonth === 'number') {
                    weekOfMonth = (s as any).weekOfMonth;
                } else if (typeof s.name === 'string') {
                    const m = s.name.match(/Week\s*(\d+)/i);
                    if (m) weekOfMonth = Number(m[1]);
                }

                // map dates, prefer explicit fields then fallbacks
                let start = s.dateStarted ?? s.dateExpectedToStart ?? null;
                let end = s.dateEnded ?? s.dateExpectedToEnd ?? null;

                // if start/end missing but epic has month/year and we know weekOfMonth, compute dates
                const epicYear = typeof aEpic.epicYear === 'number' ? aEpic.epicYear : undefined;
                const epicMonth = typeof aEpic.epicMonth === 'number' ? aEpic.epicMonth : undefined; // 1-12
                if ((!start || !end) && epicYear && epicMonth && typeof weekOfMonth === 'number') {
                    try {
                        // compute Mondays on or before first day, then collect weeks whose Monday is inside the month
                        const monthIndex = epicMonth - 1;
                        const firstDay = new Date(epicYear, monthIndex, 1);
                        const lastDay = new Date(epicYear, monthIndex + 1, 0);

                        const startCandidate = new Date(firstDay);
                        while (startCandidate.getDay() !== 1) startCandidate.setDate(startCandidate.getDate() - 1);

                        const weeks: { start: Date; end: Date }[] = [];
                        const cur = new Date(startCandidate);
                        while (cur <= lastDay) {
                            const ws = new Date(cur);
                            const we = new Date(cur);
                            we.setDate(we.getDate() + 6);
                            if (ws.getMonth() === monthIndex) {
                                weeks.push({ start: new Date(ws), end: new Date(we) });
                            }
                            cur.setDate(cur.getDate() + 7);
                        }

                        const idx = weekOfMonth - 1;
                        if (weeks[idx]) {
                            start = weeks[idx].start.toISOString();
                            end = weeks[idx].end.toISOString();
                        }
                    } catch (e) {
                        // ignore compute errors and leave start/end as-is
                    }
                }

                sprints.push({
                    id: s.id,
                    epicId: s.epicId ?? aEpic.id,
                    name: s.name,
                    sprintLabel: s.sprintLabel ?? s.label ?? null,
                    start: start,
                    end: end,
                    weekOfMonth: typeof weekOfMonth === 'number' ? weekOfMonth : undefined,
                    taskIds: sprintTaskIds,
                    createdAt: s.createdAt ?? undefined,
                    updatedAt: s.updatedAt ?? undefined,
                });
            }
        }

        epics.push({
            id: aEpic.id,
            name: aEpic.name,
            description: aEpic.description ?? undefined,
            epicYear: typeof aEpic.epicYear === 'number' ? aEpic.epicYear : undefined,
            epicMonth: typeof aEpic.epicMonth === 'number' ? aEpic.epicMonth : undefined,
            sprintIds: epicSprintIds,
            taskIds: epicTaskIds,
            metrics: aEpic.metrics ?? undefined,
            createdAt: aEpic.createdAt,
            updatedAt: aEpic.updatedAt,
        });
    }

    return { epics, sprints, tasks, sessions, checklists };
}

export default normalizeApiEpics;
