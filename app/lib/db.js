import path from 'path';
import fs from 'fs';

const cfg = require(path.join(process.cwd(), "config"));
const dbUrl = process.env.DATABASE_URL || cfg.DATABASE_URL;

if (!dbUrl) throw new Error("DATABASE_URL is not set");

const isSqlite = (u) =>
  typeof u === "string" &&
  (u.startsWith("file:") || u.includes(".sqlite") || u.startsWith("sqlite:"));

if (isSqlite(dbUrl)) {
  import Database from 'better-sqlite3';
  let dbPath = dbUrl.replace(/^file:\/\//, "").replace(/^file:/, "");
  dbPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  export default db
  module.export const __type = "sqlite";
} else {
  try {
    import prisma from './prisma';
    module.exports = prisma;
    module.export const __type = "prisma";
  } catch (e) {
    throw new Error(
      "Non-sqlite DATABASE_URL requires Prisma client. Install and generate Prisma client.",
    );
  }
}
