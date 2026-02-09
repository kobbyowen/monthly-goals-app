const prisma = require("../lib/prisma.js");

async function createSprint(payload) {
  const { tasks = [], sprints = [], ...s } = payload;
  // ensure sprint and task ids exist (Prisma schema requires id on create)
  const ensureId = (pref) =>
    `id-${pref}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  // classify row: default to epic unless explicitly marked or linked to an epic
  if (!s.kind) {
    s.kind = s.epicId ? "sprint" : "epic";
  }
  if (!s.id) s.id = ensureId("sprint");
  const tasksWithIds = (tasks || []).map((t) => ({
    ...(t || {}),
    id: t.id || ensureId("task"),
  }));
  // If a sprint with the same id exists, remove it first to ensure create returns 201
  if (s.id) {
    const existing = await prisma.sprint.findUnique({ where: { id: s.id } });
    if (existing) {
      // Only allow overwrite if same owner (or no owner set)
      if (!s.userId || !existing.userId || existing.userId === s.userId) {
        await prisma.sprint.delete({ where: { id: s.id } });
      }
    }
  }
  // create the primary sprint (this represents the epic)
  const created = await prisma.sprint.create({
    data: {
      ...convertSprintInput(s),
      tasks: {
        create: tasksWithIds.map(convertTaskInput),
      },
    },
    include: { tasks: { include: { sessions: true } } },
  });

  return created;
}

async function listSprints(userId, kind) {
  const where = {};
  if (userId) where.userId = userId;
  if (kind) where.kind = kind;
  return prisma.sprint.findMany({
    where,
    include: { tasks: { include: { sessions: true } } },
  });
}

async function getSprint(id, userId) {
  const where = userId ? { id, userId } : { id };
  const sprint = await prisma.sprint.findFirst({
    where,
    include: { tasks: { include: { sessions: true } } },
  });
  if (!sprint) return null;
  // If this row represents an epic, also load its child sprints (kind='sprint')
  if (sprint.kind === "epic") {
    const children = await prisma.sprint.findMany({
      where: { epicId: sprint.id },
      include: { tasks: { include: { sessions: true } } },
    });
    return { ...sprint, sprints: children };
  }
  return sprint;
}

async function deleteSprint(id, userId) {
  if (userId) {
    const existing = await prisma.sprint.findFirst({ where: { id, userId } });
    if (!existing) return null;
  }
  return prisma.sprint.delete({ where: { id } });
}

function convertSprintInput(s) {
  const out = { ...s };
  // Prisma expects Date objects for DateTime fields
  [
    "dateExpectedToStart",
    "dateExpectedToEnd",
    "dateStarted",
    "dateEnded",
  ].forEach((k) => {
    if (out[k] === null || out[k] === undefined) delete out[k];
    else out[k] = new Date(out[k]).toISOString();
  });
  return out;
}

function convertTaskInput(t) {
  const { sessions = [], ...rest } = t;
  const task = { ...rest };
  ["startedAt", "endedAt"].forEach((k) => {
    if (task[k] === null || task[k] === undefined) delete task[k];
    else task[k] = new Date(task[k]).toISOString();
  });
  return {
    ...task,
    sessions: {
      create: sessions.map((s) => ({
        ...s,
        startedAt: s.startedAt
          ? new Date(s.startedAt).toISOString()
          : undefined,
        endedAt: s.endedAt ? new Date(s.endedAt).toISOString() : undefined,
      })),
    },
  };
}

module.exports = { createSprint, listSprints, getSprint, deleteSprint };
