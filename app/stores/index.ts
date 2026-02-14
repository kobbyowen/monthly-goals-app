export * from './types';
export { useAuthStore } from './authStore';
export { useUserStore } from './userStore';

import useRootEpicStore, { RootEpicState } from './rootEpicStore';

export { useRootEpicStore };

export const useRootEpic = useRootEpicStore;

// Epics slice selector (renamed) — use this when you only need the epics slice
export const useEpicsStore = (<T,>(selector: (s: RootEpicState['epics']) => T) =>
    useRootEpicStore((s) => selector(s.epics))) as (<T, >(selector: (s: RootEpicState['epics']) => T) => T) & { getState: () => RootEpicState['epics'] };

// Canonical store for the app: epic store (root store alias)
export const useEpicStore = useRootEpicStore;

export const useSprintStore = (<T,>(selector: (s: RootEpicState['sprints']) => T) =>
    useRootEpicStore((s) => selector(s.sprints))) as (<T, >(selector: (s: RootEpicState['sprints']) => T) => T) & { getState: () => RootEpicState['sprints'] };

export const useTaskStore = (<T,>(selector: (s: RootEpicState['tasks']) => T) =>
    useRootEpicStore((s) => selector(s.tasks))) as (<T, >(selector: (s: RootEpicState['tasks']) => T) => T) & { getState: () => RootEpicState['tasks'] };

export const useSessionStore = (<T,>(selector: (s: RootEpicState['sessions']) => T) =>
    useRootEpicStore((s) => selector(s.sessions))) as (<T, >(selector: (s: RootEpicState['sessions']) => T) => T) & { getState: () => RootEpicState['sessions'] };

export const useChecklistStore = (<T,>(selector: (s: RootEpicState['checklists']) => T) =>
    useRootEpicStore((s) => selector(s.checklists))) as (<T, >(selector: (s: RootEpicState['checklists']) => T) => T) & { getState: () => RootEpicState['checklists'] };

export const useDashboardStore = (<T,>(selector: (s: RootEpicState['dashboard']) => T) =>
    useRootEpicStore((s) => selector(s.dashboard))) as (<T, >(selector: (s: RootEpicState['dashboard']) => T) => T) & { getState: () => RootEpicState['dashboard'] };

// Backwards-compat: attach getState to wrapper hooks so legacy `.getState()` calls work
(useEpicsStore as unknown as { getState?: () => RootEpicState['epics'] }).getState = () => useRootEpicStore.getState().epics;
(useSprintStore as unknown as { getState?: () => RootEpicState['sprints'] }).getState = () => useRootEpicStore.getState().sprints;
(useTaskStore as unknown as { getState?: () => RootEpicState['tasks'] }).getState = () => useRootEpicStore.getState().tasks;
(useSessionStore as unknown as { getState?: () => RootEpicState['sessions'] }).getState = () => useRootEpicStore.getState().sessions;
(useChecklistStore as unknown as { getState?: () => RootEpicState['checklists'] }).getState = () => useRootEpicStore.getState().checklists;
(useDashboardStore as unknown as { getState?: () => RootEpicState['dashboard'] }).getState = () => useRootEpicStore.getState().dashboard;
