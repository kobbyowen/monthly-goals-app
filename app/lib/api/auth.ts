import type { AuthUser } from './types';
import { request } from './client';

export async function login(payload: { email: string; password: string; remember?: boolean }): Promise<AuthUser> {
    return request<AuthUser>({ path: '/auth/login', method: 'POST', body: payload });
}

export async function register(payload: { name: string; email: string; password: string }): Promise<AuthUser> {
    return request<AuthUser>({ path: '/auth/register', method: 'POST', body: payload });
}

export async function logout(): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>({ path: '/auth/logout', method: 'POST' });
}
