// Small helper to ensure all client and server fetches
// include the Next.js basePath (e.g. "/time-planner").

// Import the same BASE_PATH that next.config.ts uses so
// there is a single source of truth.
import { BASE_PATH } from "../../config";

export function withBase(path: string): string {
  if (!path.startsWith("/")) path = "/" + path;
  return `${BASE_PATH}${path}`;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = withBase(path);
  return fetch(url, init);
}
