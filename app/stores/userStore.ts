import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AuthUser } from './types';

type UserState = {
    user?: AuthUser | null;
    setUser: (u?: AuthUser | null) => void;
    clearUser: () => void;
};

export const useUserStore = create<UserState>()(
    devtools((set) => ({
        user: undefined,
        setUser: (u?: AuthUser | null) => set({ user: u }),
        clearUser: () => set({ user: undefined }),
    }))
);
