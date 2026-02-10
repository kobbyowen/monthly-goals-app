// Small helper to ensure all client and server fetches
// include the Next.js basePath (e.g. "/time-planner").

// Import the same basePath that next.config.ts uses so
// there is a single source of truth.
import { basePath } from "../../basePath";

export function withBase(path: string): string {
  if (!path.startsWith("/")) path = "/" + path;
  return `${basePath}${path}`;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = withBase(path);
  return fetch(url, init);
}
