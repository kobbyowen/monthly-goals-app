import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type AuthState = {
    token?: string | null;
    authenticated: boolean;
    setToken: (t?: string | null) => void;
    setAuthenticated: (v: boolean) => void;
    clearToken: () => void;
    isAuthenticated: () => boolean;
};

export const useAuthStore = create<AuthState>()(
    devtools((set, get) => ({
        token: undefined,
        authenticated: false,
        setToken: (t?: string | null) => set({ token: t }),
        setAuthenticated: (v: boolean) => set({ authenticated: v }),
        clearToken: () => set({ token: undefined, authenticated: false }),
        isAuthenticated: () => get().authenticated || !!get().token,
    }))
);
