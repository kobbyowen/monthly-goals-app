import type { Session } from './types';
import { request } from './client';
import { v4 as uuidv4 } from 'uuid';

export async function createSession(payload: { taskId: string; startedAt?: string; id?: string }): Promise<Session> {
    const { taskId, ...rest } = payload as { taskId: string; startedAt?: string; id?: string };
    const body: Record<string, unknown> = { ...rest };
    if (!body.id) {
        body.id = uuidv4();
    }

    return request<Session>({ path: `/tasks/${encodeURIComponent(taskId)}/sessions`, method: 'POST', body });
}

export async function getSessionsForTask(taskId: string): Promise<Session[]> {
    return request<Session[]>({ path: `/tasks/${encodeURIComponent(taskId)}/sessions`, method: 'GET' });
}

export async function updateSession(id: string, payload: Partial<Session>): Promise<Session> {
    return request<Session>({ path: `/sessions/${encodeURIComponent(id)}`, method: 'PATCH', body: payload });
}

export async function deleteSession(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>({ path: `/sessions/${encodeURIComponent(id)}`, method: 'DELETE' });
}
