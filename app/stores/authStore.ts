import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type AuthState = {
    token?: string | null;
    setToken: (t?: string | null) => void;
    clearToken: () => void;
    isAuthenticated: () => boolean;
};

export const useAuthStore = create<AuthState>()(
    devtools((set, get) => ({
        token: undefined,
        setToken: (t?: string | null) => set({ token: t }),
        clearToken: () => set({ token: undefined }),
        isAuthenticated: () => !!get().token,
    }))
);
