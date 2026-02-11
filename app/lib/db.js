const path = require("path");
const fs = require("fs");

function getDatabaseUrlFromConfig() {
  let dbUrl = process.env.DATABASE_URL || null;
  if (!dbUrl) {
    try {
      const cfg = require(path.join(process.cwd(), "config.js"));
      dbUrl =
        cfg && (cfg.DATABASE_URL || (cfg.default && cfg.default.DATABASE_URL));
    } catch (e) {
      try {
        const cfg = require(path.join(process.cwd(), "config"));
        dbUrl =
          cfg &&
          (cfg.DATABASE_URL || (cfg.default && cfg.default.DATABASE_URL));
      } catch (e2) {
        dbUrl = null;
      }
    }
  }
  return dbUrl;
}

function isSqliteUrl(u) {
  if (!u || typeof u !== "string") return false;
  return (
    u.startsWith("file:") ||
    u.includes(".sqlite") ||
    u.includes("sqlite") ||
    u.startsWith("sqlite:")
  );
}

const dbUrl = getDatabaseUrlFromConfig();

if (isSqliteUrl(dbUrl)) {
  const Database = require("better-sqlite3");
  let dbPath;
  if (!dbUrl) {
    const dbDir = path.join(process.cwd(), "data");
    dbPath = path.join(dbDir, "sprint.db");
  } else if (dbUrl.startsWith("file:")) {
    const rel = dbUrl.replace(/^file:\/\//, "file:").replace(/^file:/, "");
    dbPath = path.resolve(process.cwd(), rel);
  } else {
    dbPath = path.isAbsolute(dbUrl)
      ? dbUrl
      : path.resolve(process.cwd(), dbUrl);
  }

  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  } catch (e) {}

  const db = new Database(dbPath);
  module.exports = db;
  module.exports.__type = "sqlite";
} else {
  try {
    const prisma = require("./prisma");
    module.exports = prisma;
    module.exports.__type = "prisma";
  } catch (e) {
    module.exports = {
      __type: "unsupported",
      _error: new Error(
        "Non-sqlite database selected but Prisma client not available. Set up Prisma or use a sqlite database.",
      ),
      $executeRaw: () => Promise.reject(module.exports._error),
      $queryRaw: () => Promise.reject(module.exports._error),
    };
  }
}
