import type { AuthUser } from './types';
import { request } from './client';

export async function getMe(): Promise<AuthUser | null> {
    try {
        const u = await request<AuthUser>({ path: '/me', method: 'GET' });
        return u;
    } catch (err) {
        return null;
    }
}
