export type ID = string;

export interface Checklist {
    id: ID;
    taskId: ID;
    title: string;
    done: boolean;
    // UI sometimes expects `completed` instead of `done`
    completed?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Session {
    id: ID;
    taskId: ID;
    startedAt: string;
    endedAt?: string | null;
    // `seconds` is canonical; some places used `duration` historically
    seconds?: number;
    duration?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Task {
    id: ID;
    sprintId?: ID | null;
    // server canonical field is `title` but UI historically used `name`
    title: string;
    name?: string;
    description?: string | null;
    kind?: string | null;
    estimate?: number | null;
    plannedTime?: number | null;
    startedAt?: string | null;
    endedAt?: string | null;
    timeSpent?: number | null;
    timeActuallySpent?: number | null;
    position?: number | null;
    checklists?: Checklist[];
    sessions?: Session[];
    completed?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Sprint {
    id: ID;
    epicId?: ID | null;
    name: string;
    kind?: string | null;
    label?: string | null;
    sprintLabel?: string | null;
    tasks?: Task[];
    createdAt: string;
    updatedAt: string;
}

export interface Epic {
    id: ID;
    name: string;
    sprints?: Sprint[];
    tasks?: Task[];
    metrics?: Record<string, unknown>;
    epicYear?: number;
    epicMonth?: number;
    dateEnded?: string | null;
    status?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface DashboardMetrics {
    totalEpics: number;
    totalSprints: number;
    totalTasks: number;
    [key: string]: unknown;
}

export interface ApiError {
    message: string;
    status?: number;
    code?: string;
    details?: unknown;
}

export interface AuthUser {
    id: ID;
    email: string;
    name?: string | null;
}

export interface ApiCallOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
    retries?: number;
    headers?: Record<string, string>;
}

export type ApiResult<T> = T;
