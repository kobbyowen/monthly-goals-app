const prisma = require("@lib/prisma.js");

async function createTask(sprintId, task, userId) {
  // ensure sprint belongs to user if userId provided
  if (userId) {
    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint || (sprint.userId && sprint.userId !== userId)) {
      throw new Error("Unauthorized");
    }
  }
  const t = { ...task };
  if (t.startedAt) t.startedAt = new Date(t.startedAt).toISOString();
  if (t.endedAt) t.endedAt = new Date(t.endedAt).toISOString();
  const data = { ...t, sprintId };
  // support nested checklist creation if provided as array of { title, position }
  if (Array.isArray(t.checklists) && t.checklists.length > 0) {
    data.checklists = {
      create: t.checklists.map((it) => ({
        title: it.title,
        completed: !!it.completed,
        position: typeof it.position === "number" ? it.position : null,
      })),
    };
  }
  return prisma.task.create({ data });
}

async function getTask(id, userId) {
  const t = await prisma.task.findUnique({
    where: { id },
    include: { sessions: true, sprint: true, checklists: true },
  });
  if (!t) return null;
  if (userId && t.sprint && t.sprint.userId && t.sprint.userId !== userId)
    return null;
  // remove sprint from returned object
  delete t.sprint;
  return t;
}

async function updateTask(id, data, userId) {
  // check ownership
  const existing = await prisma.task.findUnique({
    where: { id },
    include: { sprint: true },
  });
  if (!existing) throw new Error("Not found");
  if (
    userId &&
    existing.sprint &&
    existing.sprint.userId &&
    existing.sprint.userId !== userId
  ) {
    throw new Error("Unauthorized");
  }

  const allowed = [
    "name",
    "category",
    "plannedTime",
    "timeSpent",
    "timeActuallySpent",
    "startedAt",
    "endedAt",
    "completed",
  ];
  const payload = {};
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(data, k)) payload[k] = data[k];
  }
  if (payload.startedAt)
    payload.startedAt = new Date(payload.startedAt).toISOString();
  if (payload.endedAt)
    payload.endedAt = new Date(payload.endedAt).toISOString();
  if (Object.prototype.hasOwnProperty.call(payload, "completed"))
    payload.completed = !!payload.completed;
  return prisma.task.update({
    where: { id },
    data: payload,
    include: { sessions: true, checklists: true },
  });
}

async function deleteTask(id, userId) {
  const existing = await prisma.task.findUnique({
    where: { id },
    include: { sprint: true },
  });
  if (!existing) return null;
  if (
    userId &&
    existing.sprint &&
    existing.sprint.userId &&
    existing.sprint.userId !== userId
  ) {
    throw new Error("Unauthorized");
  }
  return prisma.task.delete({ where: { id } });
}

module.exports = { createTask, getTask, updateTask, deleteTask };
