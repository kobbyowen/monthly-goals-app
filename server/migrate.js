import ___app_lib_prisma from '../app/lib/prisma';
import fs from 'fs';
import path from 'path';

const migrationsDir = path.join(__dirname, "migrations");

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

async function runMigrations() {
  const dbUrl = getDatabaseUrlFromConfig();
  const maskedDbUrl = (u) => {
    try {
      if (!u) return u;
      return u.replace(/:\/\/([^:@\/]+):([^@]+)@/, "://$1:****@");
    } catch (e) {
      return u;
    }
  };
  console.log("Using DATABASE_URL:", maskedDbUrl(dbUrl));
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("No migration files found in:", migrationsDir);
    process.exit(1);
  }

  if (isSqliteUrl(dbUrl)) {
    import Database from 'better-sqlite3';
    let dbPath;
    if (!dbUrl) dbPath = path.join(process.cwd(), "data", "sprint.db");
    else if (dbUrl.startsWith("file:")) {
      const rel = dbUrl.replace(/^file:\/\//, "file:").replace(/^file:/, "");
      dbPath = path.resolve(process.cwd(), rel);
    } else {
      dbPath = path.isAbsolute(dbUrl)
        ? dbUrl
        : path.resolve(process.cwd(), dbUrl);
    }

    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const dbExists = fs.existsSync(dbPath);
    const db = new Database(dbPath);
    try {
      for (const f of files) {
        const p = path.join(migrationsDir, f);
        const sql = fs.readFileSync(p, "utf8");
        try {
          db.exec(sql);
          console.log("Applied migration:", f);
        } catch (err) {
          const msg = err && err.message ? String(err.message) : "";
          if (/duplicate column name|already exists/i.test(msg)) {
            console.warn(`Migration ${f} skipped: ${msg}`);
            continue;
          }
          console.error("Migration failed for", f, err);
          process.exit(1);
        }
      }

      if (!dbExists) {
        try {
          db.exec("PRAGMA foreign_keys = ON;");
          db.exec("DELETE FROM sessions;");
          db.exec("DELETE FROM tasks;");
          db.exec("DELETE FROM sprints;");
          db.exec("DELETE FROM auth_sessions;");
          db.exec("DELETE FROM users;");
          console.log(
            "Cleaned sample data from new database (empty on setup).",
          );
        } catch (e) {
          console.error("Failed to clean sample data:", e);
        }
      }
    } finally {
      db.close();
    }
  } else {
    // Use Prisma to run raw SQL migrations when not using sqlite
    let prisma;
    try {
      prisma = require("../app/lib/prisma");
    } catch (e) {
      console.error(
        "Prisma client not available for non-sqlite migrations:",
        e,
      );
      process.exit(1);
    }

    try {
      // Test DB connection early to fail fast on auth/connection errors
      try {
        await prisma.$queryRawUnsafe("SELECT 1");
      } catch (connErr) {
        console.error(
          "Database connection test failed for DATABASE_URL:",
          maskedDbUrl(dbUrl),
        );
        console.error(connErr && connErr.message ? connErr.message : connErr);
        try {
          await prisma.$disconnect();
        } catch (e) {}
        process.exit(1);
      }

      for (const f of files) {
        const p = path.join(migrationsDir, f);
        const sql = fs.readFileSync(p, "utf8");
        try {
          // prisma.$executeRawUnsafe runs the statements; some DBs may reject
          // multi-statement files — adjust migrations accordingly.
          await prisma.$executeRawUnsafe(sql);
          console.log("Applied migration:", f);
        } catch (err) {
          const msg = err && err.message ? String(err.message) : "";
          if (
            /duplicate column name|already exists|relation .* already exists/i.test(
              msg,
            )
          ) {
            console.warn(`Migration ${f} skipped: ${msg}`);
            continue;
          }
          console.error("Migration failed for", f, err);
          process.exit(1);
        }
      }

      // If DB newly created, attempt cleanup via Prisma
      try {
        await prisma.$executeRawUnsafe("DELETE FROM sessions;");
        await prisma.$executeRawUnsafe("DELETE FROM tasks;");
        await prisma.$executeRawUnsafe("DELETE FROM sprints;");
        await prisma.$executeRawUnsafe("DELETE FROM auth_sessions;");
        await prisma.$executeRawUnsafe("DELETE FROM users;");
        console.log("Cleaned sample data from new database (empty on setup).");
      } catch (e) {
        // best-effort cleanup; ignore if tables don't exist yet
      }
    } finally {
      try {
        await prisma.$disconnect();
      } catch (e) {}
    }
  }
}

runMigrations().catch((err) => {
  console.error("Migration run failed:", err);
  process.exit(1);
});
