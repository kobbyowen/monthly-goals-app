import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Session, ID } from './types';

type SessionState = {
    byId: Record<ID, Session>;
    allIds: ID[];
    add: (s: Session) => void;
    addMany: (ss: Session[]) => void;
    update: (id: ID, patch: Partial<Session>) => void;
    remove: (id: ID) => void;
    reset: () => void;
};

export const useSessionStore = create<SessionState>()(
    devtools((set) => ({
        byId: {},
        allIds: [],
        add: (s: Session) =>
            set((st) => ({
                byId: { ...st.byId, [s.id]: s },
                allIds: st.allIds.includes(s.id) ? st.allIds : [...st.allIds, s.id],
            })),
        addMany: (ss: Session[]) =>
            set((st) => {
                const next = { ...st.byId };
                const ids = new Set(st.allIds);
                ss.forEach((s: Session) => {
                    next[s.id] = s;
                    ids.add(s.id);
                });
                return { byId: next, allIds: Array.from(ids) };
            }),
        update: (id: ID, patch: Partial<Session>) => set((st) => ({ byId: { ...st.byId, [id]: { ...st.byId[id], ...patch } } })),
        remove: (id: ID) =>
            set((st) => {
                const next = { ...st.byId };
                delete next[id];
                return { byId: next, allIds: st.allIds.filter((x) => x !== id) };
            }),
        reset: () => set({ byId: {}, allIds: [] }),
    }))
);
