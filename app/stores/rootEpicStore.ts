import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
    Epic,
    Sprint,
    Task,
    Session,
    ChecklistItem,
    DashboardMetrics,
    ID,
} from './types';
import type { Epic as ApiEpic } from '../lib/api/types';
import normalizeApiEpics from './normalizeEpics';

type EntityState<T> = {
    byId: Record<ID, T>;
    allIds: ID[];
    add: (t: T) => void;
    addMany: (arr: T[]) => void;
    update: (id: ID, patch: Partial<T>) => void;
    remove: (id: ID) => void;
    reset: () => void;
};

type DashboardState = {
    metrics?: DashboardMetrics;
    setMetrics: (m: DashboardMetrics) => void;
    reset: () => void;
};

export type RootEpicState = {
    epics: EntityState<Epic>;
    sprints: EntityState<Sprint>;
    tasks: EntityState<Task>;
    sessions: EntityState<Session>;
    checklists: EntityState<ChecklistItem>;
    dashboard: DashboardState;
    // internal version counter used to invalidate memoized selectors
    _version: number;
    addEpic: (e: Epic) => void;
    addSprint: (s: Sprint) => void;
    addTask: (t: Task) => void;
    addSession: (s: Session) => void;
    addChecklist: (c: ChecklistItem) => void;
    addEpicsFromApi: (apiEpics: ApiEpic[]) => void;
    updateEpic: (id: ID, patch: Partial<Epic>) => void;
    updateSprint: (id: ID, patch: Partial<Sprint>) => void;
    updateTask: (id: ID, patch: Partial<Task>) => void;
    updateSession: (id: ID, patch: Partial<Session>) => void;
    updateChecklist: (id: ID, patch: Partial<ChecklistItem>) => void;
    removeEpic: (id: ID) => void;
    removeSprint: (id: ID) => void;
    removeTask: (id: ID) => void;
    removeSession: (id: ID) => void;
    removeChecklist: (id: ID) => void;
    resetAll: () => void;
    // memoized selectors
    getTasksBySprint: (sprintId: ID) => Task[];
    getSprintsByEpic: (epicId: ID) => Sprint[];
    getSessionsByTask: (taskId: ID) => Session[];
    getChecklistsByTask: (taskId: ID) => ChecklistItem[];
    getTasksByEpic: (epicId: ID) => Task[];
};

// helper factory to create an empty entity state
function createEntity<T>(): EntityState<T> {
    return {
        byId: {} as Record<ID, T>,
        allIds: [] as ID[],
        add: (_t: T) => { },
        addMany: (_arr: T[]) => { },
        update: (_id: ID, _patch: Partial<T>) => { },
        remove: (_id: ID) => { },
        reset: () => { },
    } as EntityState<T>;
}

export const useRootEpicStore = create<RootEpicState>()(
    devtools((set, get) => {
        // dashboard functions with proper typing
        const dashboard: DashboardState = {
            metrics: undefined,
            setMetrics: (m: DashboardMetrics) => set((st: RootEpicState) => ({ dashboard: { ...st.dashboard, metrics: m }, _version: (st._version ?? 0) + 1 })),
            reset: () => set((st: RootEpicState) => ({ dashboard: { ...st.dashboard, metrics: undefined }, _version: (st._version ?? 0) + 1 })),
        };

        // memoization caches (live for the lifetime of the store)
        const tasksBySprintCache: Map<ID, { version: number; result: Task[] }> = new Map();
        const sprintsByEpicCache: Map<ID, { version: number; result: Sprint[] }> = new Map();
        const sessionsByTaskCache: Map<ID, { version: number; result: Session[] }> = new Map();
        const checklistsByTaskCache: Map<ID, { version: number; result: ChecklistItem[] }> = new Map();
        const tasksByEpicCache: Map<ID, { version: number; result: Task[] }> = new Map();

        return {
            epics: {
                byId: {},
                allIds: [],
                add: (e: Epic) =>
                    set((st: RootEpicState) => ({ epics: { ...st.epics, byId: { ...st.epics.byId, [e.id]: e }, allIds: st.epics.allIds.includes(e.id) ? st.epics.allIds : [...st.epics.allIds, e.id] }, _version: (st._version ?? 0) + 1 })),
                addMany: (es: Epic[]) => set((st: RootEpicState) => {
                    const next: Record<ID, Epic> = { ...st.epics.byId };
                    const ids = new Set(st.epics.allIds);
                    es.forEach((it: Epic) => { next[it.id] = it; ids.add(it.id); });
                    return { epics: { ...st.epics, byId: next, allIds: Array.from(ids) }, _version: (st._version ?? 0) + 1 };
                }),
                update: (id: ID, patch: Partial<Epic>) => set((st: RootEpicState) => ({ epics: { ...st.epics, byId: { ...st.epics.byId, [id]: { ...st.epics.byId[id], ...patch } } }, _version: (st._version ?? 0) + 1 })),
                remove: (id: ID) => set((st: RootEpicState) => { const next = { ...st.epics.byId }; delete next[id]; return { epics: { ...st.epics, byId: next, allIds: st.epics.allIds.filter((x: ID) => x !== id) }, _version: (st._version ?? 0) + 1 }; }),
                reset: () => set((st: RootEpicState) => ({ epics: { ...st.epics, byId: {}, allIds: [] }, _version: (st._version ?? 0) + 1 })),
            },

            sprints: {
                byId: {},
                allIds: [],
                add: (s: Sprint) => set((st: RootEpicState) => ({ sprints: { ...st.sprints, byId: { ...st.sprints.byId, [s.id]: s }, allIds: st.sprints.allIds.includes(s.id) ? st.sprints.allIds : [...st.sprints.allIds, s.id] }, _version: (st._version ?? 0) + 1 })),
                addMany: (arr: Sprint[]) => set((st: RootEpicState) => { const next: Record<ID, Sprint> = { ...st.sprints.byId }; const ids = new Set(st.sprints.allIds); arr.forEach((it: Sprint) => { next[it.id] = it; ids.add(it.id); }); return { sprints: { ...st.sprints, byId: next, allIds: Array.from(ids) }, _version: (st._version ?? 0) + 1 }; }),
                update: (id: ID, patch: Partial<Sprint>) => set((st: RootEpicState) => ({ sprints: { ...st.sprints, byId: { ...st.sprints.byId, [id]: { ...st.sprints.byId[id], ...patch } } }, _version: (st._version ?? 0) + 1 })),
                remove: (id: ID) => set((st: RootEpicState) => { const next = { ...st.sprints.byId }; delete next[id]; return { sprints: { ...st.sprints, byId: next, allIds: st.sprints.allIds.filter((x: ID) => x !== id) }, _version: (st._version ?? 0) + 1 }; }),
                reset: () => set((st: RootEpicState) => ({ sprints: { ...st.sprints, byId: {}, allIds: [] }, _version: (st._version ?? 0) + 1 })),
            },

            tasks: {
                byId: {},
                allIds: [],
                add: (t: Task) => set((st: RootEpicState) => ({ tasks: { ...st.tasks, byId: { ...st.tasks.byId, [t.id]: t }, allIds: st.tasks.allIds.includes(t.id) ? st.tasks.allIds : [...st.tasks.allIds, t.id] }, _version: (st._version ?? 0) + 1 })),
                addMany: (arr: Task[]) => set((st: RootEpicState) => { const next: Record<ID, Task> = { ...st.tasks.byId }; const ids = new Set(st.tasks.allIds); arr.forEach((it: Task) => { next[it.id] = it; ids.add(it.id); }); return { tasks: { ...st.tasks, byId: next, allIds: Array.from(ids) }, _version: (st._version ?? 0) + 1 }; }),
                update: (id: ID, patch: Partial<Task>) => set((st: RootEpicState) => ({ tasks: { ...st.tasks, byId: { ...st.tasks.byId, [id]: { ...st.tasks.byId[id], ...patch } } }, _version: (st._version ?? 0) + 1 })),
                remove: (id: ID) => set((st: RootEpicState) => { const next = { ...st.tasks.byId }; delete next[id]; return { tasks: { ...st.tasks, byId: next, allIds: st.tasks.allIds.filter((x: ID) => x !== id) }, _version: (st._version ?? 0) + 1 }; }),
                reset: () => set((st: RootEpicState) => ({ tasks: { ...st.tasks, byId: {}, allIds: [] }, _version: (st._version ?? 0) + 1 })),
            },

            sessions: {
                byId: {},
                allIds: [],
                add: (s: Session) => set((st: RootEpicState) => ({ sessions: { ...st.sessions, byId: { ...st.sessions.byId, [s.id]: s }, allIds: st.sessions.allIds.includes(s.id) ? st.sessions.allIds : [...st.sessions.allIds, s.id] }, _version: (st._version ?? 0) + 1 })),
                addMany: (arr: Session[]) => set((st: RootEpicState) => { const next: Record<ID, Session> = { ...st.sessions.byId }; const ids = new Set(st.sessions.allIds); arr.forEach((it: Session) => { next[it.id] = it; ids.add(it.id); }); return { sessions: { ...st.sessions, byId: next, allIds: Array.from(ids) }, _version: (st._version ?? 0) + 1 }; }),
                update: (id: ID, patch: Partial<Session>) => set((st: RootEpicState) => ({ sessions: { ...st.sessions, byId: { ...st.sessions.byId, [id]: { ...st.sessions.byId[id], ...patch } } }, _version: (st._version ?? 0) + 1 })),
                remove: (id: ID) => set((st: RootEpicState) => { const next = { ...st.sessions.byId }; delete next[id]; return { sessions: { ...st.sessions, byId: next, allIds: st.sessions.allIds.filter((x: ID) => x !== id) }, _version: (st._version ?? 0) + 1 }; }),
                reset: () => set((st: RootEpicState) => ({ sessions: { ...st.sessions, byId: {}, allIds: [] }, _version: (st._version ?? 0) + 1 })),
            },

            checklists: {
                byId: {},
                allIds: [],
                add: (c: ChecklistItem) => set((st: RootEpicState) => ({ checklists: { ...st.checklists, byId: { ...st.checklists.byId, [c.id]: c }, allIds: st.checklists.allIds.includes(c.id) ? st.checklists.allIds : [...st.checklists.allIds, c.id] }, _version: (st._version ?? 0) + 1 })),
                addMany: (arr: ChecklistItem[]) => set((st: RootEpicState) => { const next: Record<ID, ChecklistItem> = { ...st.checklists.byId }; const ids = new Set(st.checklists.allIds); arr.forEach((it: ChecklistItem) => { next[it.id] = it; ids.add(it.id); }); return { checklists: { ...st.checklists, byId: next, allIds: Array.from(ids) }, _version: (st._version ?? 0) + 1 }; }),
                update: (id: ID, patch: Partial<ChecklistItem>) => set((st: RootEpicState) => ({ checklists: { ...st.checklists, byId: { ...st.checklists.byId, [id]: { ...st.checklists.byId[id], ...patch } } }, _version: (st._version ?? 0) + 1 })),
                remove: (id: ID) => set((st: RootEpicState) => { const next = { ...st.checklists.byId }; delete next[id]; return { checklists: { ...st.checklists, byId: next, allIds: st.checklists.allIds.filter((x: ID) => x !== id) }, _version: (st._version ?? 0) + 1 }; }),
                reset: () => set((st: RootEpicState) => ({ checklists: { ...st.checklists, byId: {}, allIds: [] }, _version: (st._version ?? 0) + 1 })),
            },

            dashboard,

            addEpic: (e: Epic) => get().epics.add(e),
            addSprint: (s: Sprint) => get().sprints.add(s),
            addTask: (t: Task) => get().tasks.add(t),
            addSession: (s: Session) => get().sessions.add(s),
            addChecklist: (c: ChecklistItem) => get().checklists.add(c),

            addEpicsFromApi: (apiEpics: ApiEpic[]) => {
                const normalized = normalizeApiEpics(apiEpics);

                // defensive cleaning: ensure ids within arrays are unique
                const cleanSprints = normalized.sprints.map((s) => ({
                    ...s,
                    taskIds: Array.from(new Set((s.taskIds || []) as ID[])),
                }));

                const cleanEpics = normalized.epics.map((e) => ({
                    ...e,
                    sprintIds: Array.from(new Set((e.sprintIds || []) as ID[])),
                    taskIds: Array.from(new Set((e.taskIds || []) as ID[])),
                }));

                // ensure tasks/sessions/checklists arrays are unique by id
                const dedupeById = <T extends { id: ID }>(arr: T[]) => {
                    const seen = new Set<ID>();
                    const out: T[] = [];
                    arr.forEach((it) => {
                        if (!seen.has(it.id)) {
                            seen.add(it.id);
                            out.push(it);
                        }
                    });
                    return out;
                };

                const cleanTasks = dedupeById(normalized.tasks);
                const cleanSessions = dedupeById(normalized.sessions);
                const cleanChecklists = dedupeById(normalized.checklists);

                // populate store slices in a stable order
                get().epics.addMany(cleanEpics as any);
                get().sprints.addMany(cleanSprints as any);
                get().tasks.addMany(cleanTasks as any);
                get().sessions.addMany(cleanSessions as any);
                get().checklists.addMany(cleanChecklists as any);
            },

            updateEpic: (id: ID, patch: Partial<Epic>) => get().epics.update(id, patch),
            updateSprint: (id: ID, patch: Partial<Sprint>) => get().sprints.update(id, patch),
            updateTask: (id: ID, patch: Partial<Task>) => get().tasks.update(id, patch),
            updateSession: (id: ID, patch: Partial<Session>) => get().sessions.update(id, patch),
            updateChecklist: (id: ID, patch: Partial<ChecklistItem>) => get().checklists.update(id, patch),

            removeEpic: (id: ID) => get().epics.remove(id),
            removeSprint: (id: ID) => get().sprints.remove(id),
            removeTask: (id: ID) => get().tasks.remove(id),
            removeSession: (id: ID) => get().sessions.remove(id),
            removeChecklist: (id: ID) => get().checklists.remove(id),

            resetAll: () => {
                get().epics.reset();
                get().sprints.reset();
                get().tasks.reset();
                get().sessions.reset();
                get().checklists.reset();
                get().dashboard.reset();
            },

            // memoized selectors
            getTasksBySprint: (sprintId: ID) => {
                const st = get();
                const ver = st._version ?? 0;
                const cached = tasksBySprintCache.get(sprintId);
                if (cached && cached.version === ver) return cached.result;
                const result: Task[] = st.tasks.allIds
                    .map((id) => st.tasks.byId[id])
                    .filter((t) => t && t.sprintId === sprintId);
                tasksBySprintCache.set(sprintId, { version: ver, result });
                return result;
            },

            getSprintsByEpic: (epicId: ID) => {
                const st = get();
                const ver = st._version ?? 0;
                const cached = sprintsByEpicCache.get(epicId);
                if (cached && cached.version === ver) return cached.result;
                const result: Sprint[] = st.sprints.allIds
                    .map((id) => st.sprints.byId[id])
                    .filter((s) => s && s.epicId === epicId);
                sprintsByEpicCache.set(epicId, { version: ver, result });
                return result;
            },

            getSessionsByTask: (taskId: ID) => {
                const st = get();
                const ver = st._version ?? 0;
                const cached = sessionsByTaskCache.get(taskId);
                if (cached && cached.version === ver) return cached.result;
                const result: Session[] = st.sessions.allIds
                    .map((id) => st.sessions.byId[id])
                    .filter((s) => s && s.taskId === taskId);
                sessionsByTaskCache.set(taskId, { version: ver, result });
                return result;
            },

            getChecklistsByTask: (taskId: ID) => {
                const st = get();
                const ver = st._version ?? 0;
                const cached = checklistsByTaskCache.get(taskId);
                if (cached && cached.version === ver) return cached.result;
                const result: ChecklistItem[] = st.checklists.allIds
                    .map((id) => st.checklists.byId[id])
                    .filter((c) => c && c.taskId === taskId);
                checklistsByTaskCache.set(taskId, { version: ver, result });
                return result;
            },

            getTasksByEpic: (epicId: ID) => {
                const st = get();
                const ver = st._version ?? 0;
                const cached = tasksByEpicCache.get(epicId);
                if (cached && cached.version === ver) return cached.result;
                // tasks linked via sprint.epicId or task.epicId
                const fromTasks: Task[] = st.tasks.allIds
                    .map((id) => st.tasks.byId[id])
                    .filter((t) => t && (t.epicId === epicId));
                const fromSprints: Task[] = st.sprints.allIds
                    .map((sid) => st.sprints.byId[sid])
                    .filter((s) => s && s.epicId === epicId)
                    .flatMap((s) => (s.taskIds ?? []) as ID[])
                    .map((tid) => st.tasks.byId[tid])
                    .filter(Boolean) as Task[];
                const mergedMap = new Map<ID, Task>();
                fromTasks.forEach((t) => mergedMap.set(t.id, t));
                fromSprints.forEach((t) => mergedMap.set(t.id, t));
                const result = Array.from(mergedMap.values());
                tasksByEpicCache.set(epicId, { version: ver, result });
                return result;
            },
        };
    })
);

export default useRootEpicStore;
