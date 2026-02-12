import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ChecklistItem, ID } from './types';

type ChecklistState = {
    byId: Record<ID, ChecklistItem>;
    allIds: ID[];
    add: (c: ChecklistItem) => void;
    addMany: (cs: ChecklistItem[]) => void;
    update: (id: ID, patch: Partial<ChecklistItem>) => void;
    remove: (id: ID) => void;
    reset: () => void;
};

export const useChecklistStore = create<ChecklistState>()(
    devtools((set) => ({
        byId: {},
        allIds: [],
        add: (c: ChecklistItem) =>
            set((s) => ({
                byId: { ...s.byId, [c.id]: c },
                allIds: s.allIds.includes(c.id) ? s.allIds : [...s.allIds, c.id],
            })),
        addMany: (cs: ChecklistItem[]) =>
            set((s) => {
                const next = { ...s.byId };
                const ids = new Set(s.allIds);
                cs.forEach((c: ChecklistItem) => {
                    next[c.id] = c;
                    ids.add(c.id);
                });
                return { byId: next, allIds: Array.from(ids) };
            }),
        update: (id: ID, patch: Partial<ChecklistItem>) => set((s) => ({ byId: { ...s.byId, [id]: { ...s.byId[id], ...patch } } })),
        remove: (id: ID) =>
            set((s) => {
                const next = { ...s.byId };
                delete next[id];
                return { byId: next, allIds: s.allIds.filter((x) => x !== id) };
            }),
        reset: () => set({ byId: {}, allIds: [] }),
    }))
);
