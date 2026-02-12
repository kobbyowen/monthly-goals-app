import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { DashboardMetrics } from './types';

type DashboardState = {
    metrics?: DashboardMetrics;
    setMetrics: (m: DashboardMetrics) => void;
    reset: () => void;
};

export const useDashboardStore = create<DashboardState>()(
    devtools((set) => ({
        metrics: undefined,
        setMetrics: (m: DashboardMetrics) => set({ metrics: m }),
        reset: () => set({ metrics: undefined }),
    }))
);
