import type { Task } from './types';
import { request } from './client';
import { v4 as uuidv4 } from 'uuid';

export async function getTask(id: string): Promise<Task> {
    return request<Task>({ path: `/tasks/${encodeURIComponent(id)}`, method: 'GET' });
}

/**
 * Create task. The server expects POST to `/sprints/:id/tasks`.
 * We generate a client id and normalize fields to match server expectations.
 */
export async function createTask(payload: { sprintId?: string | null; title: string; description?: string | null; plannedTime?: number | null }): Promise<Task> {
    const clientId = uuidv4();
    const body: any = {
        id: clientId,
        name: payload.title,
        plannedTime: typeof payload.plannedTime === 'number' ? payload.plannedTime : 0,
    };

    if (payload.sprintId) {
        return request<Task>({ path: `/sprints/${encodeURIComponent(payload.sprintId)}/tasks`, method: 'POST', body });
    }

    // fallback to generic tasks route if server implements it in future
    return request<Task>({ path: '/tasks', method: 'POST', body });
}

export async function updateTask(id: string, payload: Partial<Task>): Promise<Task> {
    const updated = await request<Task>({ path: `/tasks/${encodeURIComponent(id)}`, method: 'PATCH', body: payload });
    // Ensure `recurring` is present in the returned object when the caller updated it.
    if ((updated as any).recurring === undefined && (payload as any) && Object.prototype.hasOwnProperty.call(payload, 'recurring')) {
        (updated as any).recurring = !!(payload as any).recurring;
    }
    return updated;
}

export async function deleteTask(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>({ path: `/tasks/${encodeURIComponent(id)}`, method: 'DELETE' });
}
