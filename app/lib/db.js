import path from "path";
import fs from "fs";
import { createRequire } from "module";
import config from "../../config.js";
import prismaClient from "./prisma.js";

const require = createRequire(import.meta.url);

const cfg = config;
const dbUrl = process.env.DATABASE_URL || cfg.DATABASE_URL;

if (!dbUrl) throw new Error("DATABASE_URL is not set");

const isSqlite = (u) =>
  typeof u === "string" &&
  (u.startsWith("file:") || u.includes(".sqlite") || u.startsWith("sqlite:"));

let db;
let dbType = "unknown";

if (isSqlite(dbUrl)) {
  const Database = require("better-sqlite3");
  let dbPath = dbUrl.replace(/^file:\/\//, "").replace(/^file:/, "");
  dbPath = path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(process.cwd(), dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  dbType = "sqlite";
} else {
  // use statically imported Prisma client
  if (!prismaClient) {
    throw new Error(
      "Non-sqlite DATABASE_URL requires Prisma client. Install and generate Prisma client.",
    );
  }
  db = prismaClient?.default || prismaClient;
  dbType = "prisma";
}

export default db;
export const __type = dbType;
