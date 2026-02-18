import type { Todo } from './types';
import { request } from './client';

export async function listTodos(params?: { fromDate?: string; toDate?: string; sprintId?: string; taskId?: string; status?: string; completed?: boolean; }): Promise<{ items: Todo[]; fromDate?: string; toDate?: string }> {
    const qs = new URLSearchParams();
    if (params?.fromDate) qs.set('from', params.fromDate);
    if (params?.toDate) qs.set('to', params.toDate);
    if (params?.sprintId) qs.set('sprintId', params.sprintId);
    if (params?.taskId) qs.set('taskId', params.taskId);
    if (params?.status) qs.set('status', params.status);
    if (typeof params?.completed === 'boolean') qs.set('completed', String(params.completed));
    const path = `/todos${qs.toString() ? ('?' + qs.toString()) : ''}`;
    return request<{ items: Todo[]; fromDate?: string; toDate?: string }>({ path, method: 'GET' });
}

export async function createTodo(payload: Partial<Todo> & { sprintId: string; title: string; dueDate: string }): Promise<Todo> {
    return request<Todo>({ path: '/todos', method: 'POST', body: payload });
}

export async function updateTodo(id: string, payload: Partial<Todo>): Promise<Todo> {
    return request<Todo>({ path: `/todos/${encodeURIComponent(id)}`, method: 'PATCH', body: payload });
}

export async function deleteTodo(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>({ path: `/todos/${encodeURIComponent(id)}`, method: 'DELETE' });
}

export async function generateTodos(payload: { sprint_id: string; epic_id?: string; task_ids: string[]; allocated_time_today: number }): Promise<{ created: Todo[] }> {
    return request<{ created: Todo[] }>({ path: '/todos/generate', method: 'POST', body: payload });
}
