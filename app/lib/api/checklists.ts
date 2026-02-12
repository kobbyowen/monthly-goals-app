import type { Checklist } from './types';
import { request } from './client';

export async function createChecklist(payload: { taskId: string; title: string }): Promise<Checklist> {
    return request<Checklist>({ path: '/checklists', method: 'POST', body: payload });
}

export async function updateChecklist(id: string, payload: Partial<Checklist>): Promise<Checklist> {
    return request<Checklist>({ path: `/checklists/${encodeURIComponent(id)}`, method: 'PATCH', body: payload });
}

export async function deleteChecklist(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>({ path: `/checklists/${encodeURIComponent(id)}`, method: 'DELETE' });
}
