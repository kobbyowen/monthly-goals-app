import type { Task } from './types';
import { request } from './client';

export async function getTask(id: string): Promise<Task> {
    return request<Task>({ path: `/tasks/${encodeURIComponent(id)}`, method: 'GET' });
}

export async function createTask(payload: { sprintId?: string | null; title: string; description?: string | null }): Promise<Task> {
    return request<Task>({ path: '/tasks', method: 'POST', body: payload });
}

export async function updateTask(id: string, payload: Partial<Task>): Promise<Task> {
    return request<Task>({ path: `/tasks/${encodeURIComponent(id)}`, method: 'PATCH', body: payload });
}

export async function deleteTask(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>({ path: `/tasks/${encodeURIComponent(id)}`, method: 'DELETE' });
}
