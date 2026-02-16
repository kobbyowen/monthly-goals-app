import { request } from './client';

export async function createPlan(payload: any) {
    return request({ path: '/goals/epic', method: 'POST', body: payload });
}

export default { createPlan };
