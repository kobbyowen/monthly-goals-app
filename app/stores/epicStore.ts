import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Epic, ID } from './types';

type EpicState = {
    byId: Record<ID, Epic>;
    allIds: ID[];
    add: (e: Epic) => void;
    addMany: (es: Epic[]) => void;
    update: (id: ID, patch: Partial<Epic>) => void;
    remove: (id: ID) => void;
    reset: () => void;
};

export const useEpicStore = create<EpicState>()(
    devtools((set, get) => ({
        byId: {},
        allIds: [],
        add: (e: Epic) =>
            set((s) => ({
                byId: { ...s.byId, [e.id]: e },
                allIds: s.allIds.includes(e.id) ? s.allIds : [...s.allIds, e.id],
            })),
        addMany: (es: Epic[]) =>
            set((s) => {
                const next = { ...s.byId };
                const ids = new Set(s.allIds);
                es.forEach((e: Epic) => {
                    next[e.id] = e;
                    ids.add(e.id);
                });
                return { byId: next, allIds: Array.from(ids) };
            }),
        update: (id: ID, patch: Partial<Epic>) =>
            set((s) => ({ byId: { ...s.byId, [id]: { ...s.byId[id], ...patch } } })),
        remove: (id: ID) =>
            set((s) => {
                const next = { ...s.byId };
                delete next[id];
                return { byId: next, allIds: s.allIds.filter((x) => x !== id) };
            }),
        reset: () => set({ byId: {}, allIds: [] }),
    }))
);
