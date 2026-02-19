import { Epic as ApiEpic } from '../lib/api/types';
import { Epic, Sprint, Task, Session, ChecklistItem, ID } from './types';

type Normalized = {
    epics: Epic[];
    sprints: Sprint[];
    tasks: Task[];
    sessions: Session[];
    checklists: ChecklistItem[];
    todos?: any[];
};

export function normalizeApiEpics(apiEpics: ApiEpic[]): Normalized {
    const epics: Epic[] = [];
    const sprints: Sprint[] = [];
    const tasks: Task[] = [];
    const sessions: Session[] = [];
    const checklists: ChecklistItem[] = [];
    const todos: any[] = [];

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

                // normalize todoTasks attached directly to task
                if (Array.isArray((t as any).todoTasks)) {
                    for (const td of (t as any).todoTasks) {
                        todos.push({
                            id: td.id,
                            sprintId: td.sprintId ?? null,
                            taskId: td.taskId ?? taskId,
                            title: td.title,
                            dueDate: td.dueDate ?? undefined,
                            plannedHours: td.plannedHours ?? td.plannedTime ?? undefined,
                            usedSeconds: td.usedSeconds ?? undefined,
                            status: td.status ?? undefined,
                            completed: td.completed ?? false,
                            completedAt: td.completedAt ?? undefined,
                            priority: td.priority ?? undefined,
                            sortOrder: td.sortOrder ?? undefined,
                            createdAt: td.createdAt ?? undefined,
                            updatedAt: td.updatedAt ?? undefined,
                        });
                    }
                }

                tasks.push({
                    id: t.id,
                    sprintId: t.sprintId ?? null,
                    epicId: null,
                    name: t.name ?? t.title,
                    recurring: !!t.recurring,
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
                            recurring: !!t.recurring,
                            description: t.description ?? null,
                            completed: t.completed ?? false,
                            plannedTime: t.plannedTime ?? t.estimate ?? null,
                            sessionIds,
                            checklistIds,
                            position: t.position ?? undefined,
                            createdAt: t.createdAt ?? undefined,
                            updatedAt: t.updatedAt ?? undefined,
                        });
                        // normalize todoTasks within sprint->task
                        if (Array.isArray((t as any).todoTasks)) {
                            for (const td of (t as any).todoTasks) {
                                todos.push({
                                    id: td.id,
                                    sprintId: td.sprintId ?? s.id,
                                    taskId: td.taskId ?? t.id,
                                    title: td.title,
                                    dueDate: td.dueDate ?? undefined,
                                    plannedHours: td.plannedHours ?? td.plannedTime ?? undefined,
                                    usedSeconds: td.usedSeconds ?? undefined,
                                    status: td.status ?? undefined,
                                    completed: td.completed ?? false,
                                    completedAt: td.completedAt ?? undefined,
                                    priority: td.priority ?? undefined,
                                    sortOrder: td.sortOrder ?? undefined,
                                    createdAt: td.createdAt ?? undefined,
                                    updatedAt: td.updatedAt ?? undefined,
                                });
                            }
                        }
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
                const start = s.dateStarted ?? s.dateExpectedToStart ?? null;
                const end = s.dateEnded ?? s.dateExpectedToEnd ?? null;

                // Do not compute or guess start/end dates on the frontend.
                // Preserve only whatever the backend provided (dateStarted/dateExpectedToStart/dateEnded/dateExpectedToEnd).

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

                // also normalize any todoTasks attached directly to sprint
                if (Array.isArray((s as any).todoTasks)) {
                    for (const td of (s as any).todoTasks) {
                        todos.push({
                            id: td.id,
                            sprintId: td.sprintId ?? s.id,
                            taskId: td.taskId ?? null,
                            title: td.title,
                            dueDate: td.dueDate ?? undefined,
                            plannedHours: td.plannedHours ?? td.plannedTime ?? undefined,
                            usedSeconds: td.usedSeconds ?? undefined,
                            status: td.status ?? undefined,
                            completed: td.completed ?? false,
                            completedAt: td.completedAt ?? undefined,
                            priority: td.priority ?? undefined,
                            sortOrder: td.sortOrder ?? undefined,
                            createdAt: td.createdAt ?? undefined,
                            updatedAt: td.updatedAt ?? undefined,
                        });
                    }
                }
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

    return { epics, sprints, tasks, sessions, checklists, todos };
}

export default normalizeApiEpics;
