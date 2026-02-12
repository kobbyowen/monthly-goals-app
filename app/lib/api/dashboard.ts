import type { DashboardMetrics } from './types';
import { request } from './client';

export async function getDashboard(): Promise<DashboardMetrics> {
    return request<DashboardMetrics>({ path: '/analytics', method: 'GET' });
}
