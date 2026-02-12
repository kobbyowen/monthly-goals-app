import type { ApiCallOptions, ApiError } from './types';

const DEFAULT_BASE = '/api';
const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RETRIES = 1;

export type RequestParams = {
    method?: string;
    path: string;
    body?: unknown;
    baseUrl?: string;
    options?: ApiCallOptions;
};

function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

export async function request<T>({ method = 'GET', path, body, baseUrl = DEFAULT_BASE, options = {} }: RequestParams): Promise<T> {
    const url = `${baseUrl}${path}`;
    const retries = options.retries ?? DEFAULT_RETRIES;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= retries) {
        const controller = new AbortController();
        const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
        const signal = options.signal
            ? (new AbortController()).signal // prefer caller signal if provided; we'll combine below
            : controller.signal;

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            };

            const res = await fetch(url, {
                method,
                headers,
                body: body != null ? JSON.stringify(body) : undefined,
                signal: options.signal ?? controller.signal,
            });

            if (timer) clearTimeout(timer);

            const text = await res.text();
            const data: unknown = text ? JSON.parse(text) : null;

            if (!res.ok) {
                const details = (data && typeof data === 'object') ? (data as Record<string, unknown>) : undefined;
                const message = details && 'message' in details ? String((details as Record<string, unknown>)['message']) : res.statusText || 'Request failed';
                const err: ApiError = {
                    message,
                    status: res.status,
                    details,
                };
                throw err;
            }

            return data as T;
        } catch (err: unknown) {
            lastError = err;
            // don't retry on AbortError
            const name = (err && typeof err === 'object' && 'name' in err) ? (err as { name?: unknown }).name : undefined;
            if (name === 'AbortError') throw err;
            attempt += 1;
            if (attempt > retries) break;
            // exponential backoff
            await sleep(150 * Math.pow(2, attempt));
        } finally {
            // nothing to cleanup for now
        }
    }

    throw lastError ?? { message: 'Unknown request error' };
}

export const withBase = (path: string, base = DEFAULT_BASE) => `${base}${path}`;
