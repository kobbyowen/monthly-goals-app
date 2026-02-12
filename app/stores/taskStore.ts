import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Task, ID } from './types';

type TaskState = {
    byId: Record<ID, Task>;
    allIds: ID[];
    add: (task: Task) => void;
    addMany: (tasks: Task[]) => void;
    update: (id: ID, patch: Partial<Task>) => void;
    remove: (id: ID) => void;
    reset: () => void;
};

export const useTaskStore = create<TaskState>()(
    devtools((set) => ({
        byId: {},
        allIds: [],
        add: (task: Task) =>
            set((s) => ({
                byId: { ...s.byId, [task.id]: task },
                allIds: s.allIds.includes(task.id) ? s.allIds : [...s.allIds, task.id],
            })),
        addMany: (tasks: Task[]) =>
            set((s) => {
                const next = { ...s.byId };
                const ids = new Set(s.allIds);
                tasks.forEach((t: Task) => {
                    next[t.id] = t;
                    ids.add(t.id);
                });
                return { byId: next, allIds: Array.from(ids) };
            }),
        update: (id: ID, patch: Partial<Task>) => set((s) => ({ byId: { ...s.byId, [id]: { ...s.byId[id], ...patch } } })),
        remove: (id: ID) =>
            set((s) => {
                const next = { ...s.byId };
                delete next[id];
                return { byId: next, allIds: s.allIds.filter((x) => x !== id) };
            }),
        reset: () => set({ byId: {}, allIds: [] }),
    }))
);
