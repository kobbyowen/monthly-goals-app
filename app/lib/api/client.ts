import type { ApiCallOptions, ApiError } from './types';

const DEFAULT_BASE = '/api';
const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RETRIES = 1;

export type RequestParams = {
    method?: string;
    path: string;
    body?: any;
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
    let lastError: any;

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
            const data = text ? JSON.parse(text) : null;

            if (!res.ok) {
                const err: ApiError = {
                    message: data?.message || res.statusText || 'Request failed',
                    status: res.status,
                    details: data,
                };
                throw err;
            }

            return data as T;
        } catch (err: any) {
            lastError = err;
            // don't retry on AbortError
            if (err?.name === 'AbortError') throw err;
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
