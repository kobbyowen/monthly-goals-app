const crypto = require("crypto");
const prisma = require("./prisma.js");

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, originalHash] = stored.split(":");
  if (!salt || !originalHash) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(originalHash, "hex"),
  );
}

async function createUser({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email already registered");
  const passwordHash = hashPassword(password);
  const user = await prisma.user.create({
    data: {
      id: generateId("user"),
      name: name || null,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    },
  });
  return user;
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const session = await prisma.authSession.create({
    data: {
      id: generateId("sess"),
      token,
      userId,
      createdAt: new Date().toISOString(),
    },
  });
  return session;
}

async function deleteSessionByToken(token) {
  if (!token) return;
  try {
    await prisma.authSession.delete({ where: { token } });
  } catch (e) {
    // ignore missing session
  }
}

async function getUserByCredentials(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

async function getUserFromToken(token) {
  if (!token) return null;
  const session = await prisma.authSession.findUnique({
    where: { token },
    include: { user: true },
  });
  return session?.user || null;
}

module.exports = {
  generateId,
  hashPassword,
  verifyPassword,
  createUser,
  createSession,
  deleteSessionByToken,
  getUserByCredentials,
  getUserFromToken,
};
