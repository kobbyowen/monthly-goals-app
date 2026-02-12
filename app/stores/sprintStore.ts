import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Sprint, ID } from './types';

type SprintState = {
    byId: Record<ID, Sprint>;
    allIds: ID[];
    add: (sprint: Sprint) => void;
    addMany: (sprints: Sprint[]) => void;
    update: (id: ID, patch: Partial<Sprint>) => void;
    remove: (id: ID) => void;
    reset: () => void;
};

export const useSprintStore = create<SprintState>()(
    devtools((set) => ({
        byId: {},
        allIds: [],
        add: (sprint: Sprint) =>
            set((st) => ({
                byId: { ...st.byId, [sprint.id]: sprint },
                allIds: st.allIds.includes(sprint.id) ? st.allIds : [...st.allIds, sprint.id],
            })),
        addMany: (sprints: Sprint[]) =>
            set((st) => {
                const next = { ...st.byId };
                const ids = new Set(st.allIds);
                sprints.forEach((s: Sprint) => {
                    next[s.id] = s;
                    ids.add(s.id);
                });
                return { byId: next, allIds: Array.from(ids) };
            }),
        update: (id: ID, patch: Partial<Sprint>) => set((st) => ({ byId: { ...st.byId, [id]: { ...st.byId[id], ...patch } } })),
        remove: (id: ID) =>
            set((st) => {
                const next = { ...st.byId };
                delete next[id];
                return { byId: next, allIds: st.allIds.filter((x) => x !== id) };
            }),
        reset: () => set({ byId: {}, allIds: [] }),
    }))
);
