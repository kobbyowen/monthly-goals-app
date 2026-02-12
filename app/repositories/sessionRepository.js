const prisma = require("@lib/prisma.js");

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
  const created = await prisma.session.create({ data: { ...sess, taskId } });

  // If task doesn't have a startedAt timestamp, set it so task shows In Progress
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (task && !task.startedAt && created.startedAt) {
      await prisma.task.update({
        where: { id: taskId },
        data: { startedAt: created.startedAt, completed: false },
      });
    }
  } catch (e) {
    // ignore background update errors
    console.error("createSession: failed to update parent task", e);
  }

  return created;
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
  const updated = await prisma.session.update({ where: { id }, data: payload });

  // If this update closed the session (endedAt provided), recompute task aggregates
  try {
    if (updated.endedAt) {
      const taskId = updated.taskId;
      // sum durations from sessions
      const sessions = await prisma.session.findMany({ where: { taskId } });
      const totalDuration = sessions.reduce(
        (s, it) => s + (it.duration || 0),
        0,
      );
      const latestEnded = sessions.reduce((m, it) => {
        if (!it.endedAt) return m;
        const ts = new Date(it.endedAt).getTime();
        return Math.max(m, ts);
      }, 0);

      const taskUpdate = { timeActuallySpent: totalDuration };
      if (latestEnded > 0)
        taskUpdate.endedAt = new Date(latestEnded).toISOString();

      await prisma.task.update({ where: { id: taskId }, data: taskUpdate });
    }
  } catch (e) {
    console.error("updateSession: failed to update parent task aggregates", e);
  }

  return updated;
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
