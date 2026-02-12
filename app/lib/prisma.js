import path from 'path';
import { PrismaClient } from '@prisma/client';

// Ensure Prisma sees DATABASE_URL at runtime. Avoid static `require()` so Next's
// bundler doesn't try to resolve project files during client-side build.
function normalizeDbUrl(u) {
  if (!u || typeof u !== "string") return u;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) {
    // If it's a file: URL, ensure the path after the scheme is absolute.
    if (u.startsWith("file:")) {
      const rest = u.replace(/^file:\/\//, "").replace(/^file:/, "");
      const abs = path.isAbsolute(rest)
        ? rest
        : path.resolve(process.cwd(), rest);
      return "file:" + abs;
    }
    return u;
  }
  const abs = path.isAbsolute(u) ? u : path.resolve(process.cwd(), u);
  return "file:" + abs;
}

try {
  if (!process.env.DATABASE_URL) {
    const req = eval("require");
    const cfg = req(path.join(process.cwd(), "config"));
    if (cfg && cfg.DATABASE_URL)
      process.env.DATABASE_URL = normalizeDbUrl(cfg.DATABASE_URL);
  } else {
    process.env.DATABASE_URL = normalizeDbUrl(process.env.DATABASE_URL);
  }
} catch (e) {
  // ignore if config isn't accessible during build/bundling
}

let prisma;
if (!global.__prisma) {
  global.__prisma = new PrismaClient();
}
prisma = global.__prisma;

export default prisma