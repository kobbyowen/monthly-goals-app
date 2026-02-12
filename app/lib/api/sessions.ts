import type { Session } from './types';
import { request } from './client';

export async function createSession(payload: { taskId: string; startedAt?: string }): Promise<Session> {
    return request<Session>({ path: '/sessions', method: 'POST', body: payload });
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
