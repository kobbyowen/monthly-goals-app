const path = require("path");
const { PrismaClient } = require("@prisma/client");

// Ensure Prisma sees DATABASE_URL at runtime. Avoid static `require()` so Next's
// bundler doesn't try to resolve project files during client-side build.
try {
  if (!process.env.DATABASE_URL) {
    const req = eval("require");
    const cfg = req(path.join(process.cwd(), "config"));
    if (cfg && cfg.DATABASE_URL) process.env.DATABASE_URL = cfg.DATABASE_URL;
  }
} catch (e) {
  // ignore if config isn't accessible during build/bundling
}

let prisma;
if (!global.__prisma) {
  global.__prisma = new PrismaClient();
}
prisma = global.__prisma;

module.exports = prisma;
