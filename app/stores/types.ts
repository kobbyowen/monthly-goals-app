export type ID = string;

export interface Epic {
    id: ID;
    name: string;
    description?: string | null;
    epicYear?: number;
    epicMonth?: number;
    sprintIds: ID[];
    taskIds?: ID[];
    metrics?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
}

export interface Sprint {
    id: ID;
    epicId?: ID | null;
    name: string;
    sprintLabel?: string | null;
    start?: string | null;
    weekOfMonth?: number;
    end?: string | null;
    taskIds: ID[];
    createdAt?: string;
    updatedAt?: string;
}

export interface Task {
    id: ID;
    sprintId?: ID | null;
    epicId?: ID | null;
    name: string;
    description?: string | null;
    completed?: boolean;
    plannedTime?: number | null;
    sessionIds: ID[];
    checklistIds: ID[];
    position?: number | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface Session {
    id: ID;
    taskId: ID;
    startedAt: string;
    endedAt?: string | null;
    seconds?: number | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface ChecklistItem {
    id: ID;
    taskId: ID;
    title: string;
    done: boolean;
    position?: number | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface DashboardMetrics {
    totalEpics: number;
    totalSprints: number;
    totalTasks: number;
    [key: string]: unknown;
}

export interface AuthUser {
    id: ID;
    email: string;
    name?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
