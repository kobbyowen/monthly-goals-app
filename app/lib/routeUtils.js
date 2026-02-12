export function getParamFromUrl(req, segmentName) {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf(segmentName);
    if (idx >= 0 && parts.length > idx + 1) return parts[idx + 1];
  } catch {
    // ignore
  }
  return undefined;
}
