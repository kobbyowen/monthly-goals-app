// Small helper to ensure all client and server fetches
// include the Next.js basePath (e.g. "/time-planner").

// Keep this in sync with next.config.ts basePath. In production,
// prefer setting NEXT_PUBLIC_BASE_PATH to override if needed.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/time-planner";

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
