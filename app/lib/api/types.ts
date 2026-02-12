export type ID = string;

export interface Checklist {
    id: ID;
    taskId: ID;
    title: string;
    done: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Session {
    id: ID;
    taskId: ID;
    startedAt: string;
    endedAt?: string | null;
    seconds?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Task {
    id: ID;
    sprintId?: ID | null;
    title: string;
    description?: string | null;
    kind?: string | null;
    estimate?: number | null;
    position?: number | null;
    checklists?: Checklist[];
    sessions?: Session[];
    createdAt: string;
    updatedAt: string;
}

export interface Sprint {
    id: ID;
    epicId?: ID | null;
    name: string;
    kind?: string | null;
    label?: string | null;
    tasks?: Task[];
    createdAt: string;
    updatedAt: string;
}

export interface Epic {
    id: ID;
    name: string;
    sprints?: Sprint[];
    metrics?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface DashboardMetrics {
    totalEpics: number;
    totalSprints: number;
    totalTasks: number;
    [key: string]: any;
}

export interface ApiError {
    message: string;
    status?: number;
    code?: string;
    details?: any;
}

export interface ApiCallOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
    retries?: number;
    headers?: Record<string, string>;
}

export type ApiResult<T> = T;
