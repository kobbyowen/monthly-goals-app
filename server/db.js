const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dbDir = path.join(process.cwd(), "data");
const dbPath = path.join(dbDir, "sprint.db");

fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);

module.exports = db;
