const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const migrationsDir = path.join(__dirname, "migrations");
const dbDir = path.join(process.cwd(), "data");
const dbPath = path.join(dbDir, "sprint.db");

fs.mkdirSync(dbDir, { recursive: true });

const dbExists = fs.existsSync(dbPath);
const db = new Database(dbPath);

// Apply all .sql files in the migrations directory, in filename sort order
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("No migration files found in:", migrationsDir);
  process.exit(1);
}

try {
  for (const f of files) {
    const p = path.join(migrationsDir, f);
    const sql = fs.readFileSync(p, "utf8");
    try {
      db.exec(sql);
      console.log("Applied migration:", f);
    } catch (err) {
      console.error("Migration failed for", f, err);
      process.exit(1);
    }
  }
} catch (err) {
  console.error("Migration run failed:", err);
  process.exit(1);
} finally {
  // If the DB was newly created, ensure no dummy/sample rows remain
  if (!dbExists) {
    try {
      db.exec("PRAGMA foreign_keys = ON;");
      db.exec("DELETE FROM sessions;");
      db.exec("DELETE FROM tasks;");
      db.exec("DELETE FROM sprints;");
      db.exec("DELETE FROM auth_sessions;");
      db.exec("DELETE FROM users;");
      console.log("Cleaned sample data from new database (empty on setup).");
    } catch (e) {
      console.error("Failed to clean sample data:", e);
    }
  }
  db.close();
}
