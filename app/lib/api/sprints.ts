import type { Sprint } from './types';
import { request } from './client';

export async function getSprints(): Promise<Sprint[]> {
    return request<Sprint[]>({ path: '/sprints', method: 'GET' });
}

export async function getSprint(id: string): Promise<Sprint> {
    return request<Sprint>({ path: `/sprints/${encodeURIComponent(id)}`, method: 'GET' });
}

export async function createSprint(payload: { epicId?: string | null; name: string; kind?: string | null; label?: string | null }): Promise<Sprint> {
    return request<Sprint>({ path: '/sprints', method: 'POST', body: payload });
}

export async function updateSprint(id: string, payload: Partial<Sprint>): Promise<Sprint> {
    return request<Sprint>({ path: `/sprints/${encodeURIComponent(id)}`, method: 'PUT', body: payload });
}

export async function deleteSprint(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>({ path: `/sprints/${encodeURIComponent(id)}`, method: 'DELETE' });
}
