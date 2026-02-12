import type { Epic } from './types';
import { request } from './client';

export async function getEpics(): Promise<Epic[]> {
    return request<Epic[]>({ path: '/epics', method: 'GET' });
}

export async function getEpic(id: string): Promise<Epic> {
    return request<Epic>({ path: `/epics/${encodeURIComponent(id)}`, method: 'GET' });
}

export async function createEpic(payload: { name: string }): Promise<Epic> {
    return request<Epic>({ path: '/epics', method: 'POST', body: payload });
}

export async function updateEpic(id: string, payload: Partial<Epic>): Promise<Epic> {
    return request<Epic>({ path: `/epics/${encodeURIComponent(id)}`, method: 'PUT', body: payload });
}

export async function deleteEpic(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>({ path: `/epics/${encodeURIComponent(id)}`, method: 'DELETE' });
}
