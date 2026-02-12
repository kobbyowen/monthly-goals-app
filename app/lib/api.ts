
import cfg from "../../config";
const API_URL_BASE: string = cfg.API_URL_BASE || cfg.BASE_PATH || "";

export function withBase(path: string): string {
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_URL_BASE}${path}`;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = withBase(path);
  return fetch(url, init);
}

// Re-export the modular API helpers from `app/lib/api/*` so imports
// using the `@lib/api` path can access typed helpers like `getTask`.
export * from "./api/index";
