const prisma = require("../lib/prisma.js");

async function createSession(taskId, s, userId) {
  // verify task belongs to user
  if (userId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { sprint: true },
    });
    if (
      !task ||
      (task.sprint && task.sprint.userId && task.sprint.userId !== userId)
    ) {
      throw new Error("Unauthorized");
    }
  }
  const sess = { ...s };
  if (sess.startedAt) sess.startedAt = new Date(sess.startedAt).toISOString();
  if (sess.endedAt) sess.endedAt = new Date(sess.endedAt).toISOString();
  return prisma.session.create({ data: { ...sess, taskId } });
}

async function getSessionsForTask(taskId, userId) {
  if (userId) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { sprint: true },
    });
    if (
      !task ||
      (task.sprint && task.sprint.userId && task.sprint.userId !== userId)
    ) {
      throw new Error("Unauthorized");
    }
  }
  return prisma.session.findMany({ where: { taskId } });
}

async function updateSession(id, data, userId) {
  // verify ownership via session -> task -> sprint
  const existing = await prisma.session.findUnique({
    where: { id },
    include: { task: { include: { sprint: true } } },
  });
  if (!existing) throw new Error("Not found");
  if (
    userId &&
    existing.task &&
    existing.task.sprint &&
    existing.task.sprint.userId &&
    existing.task.sprint.userId !== userId
  ) {
    throw new Error("Unauthorized");
  }
  const payload = { ...data };
  if (payload.startedAt)
    payload.startedAt = new Date(payload.startedAt).toISOString();
  if (payload.endedAt)
    payload.endedAt = new Date(payload.endedAt).toISOString();
  return prisma.session.update({ where: { id }, data: payload });
}

async function deleteSession(id, userId) {
  const existing = await prisma.session.findUnique({
    where: { id },
    include: { task: { include: { sprint: true } } },
  });
  if (!existing) return null;
  if (
    userId &&
    existing.task &&
    existing.task.sprint &&
    existing.task.sprint.userId &&
    existing.task.sprint.userId !== userId
  ) {
    throw new Error("Unauthorized");
  }
  return prisma.session.delete({ where: { id } });
}

module.exports = {
  createSession,
  getSessionsForTask,
  updateSession,
  deleteSession,
};
