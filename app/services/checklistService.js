const checklistRepo = require("@repositories/checklistRepository.js");
const prisma = require("@lib/prisma.js");

async function createChecklist(taskId, payload, userId) {
  if (!payload || !payload.title || !payload.title.trim()) {
    throw new Error("Title is required");
  }

  if (userId) {
    const t = await prisma.task.findUnique({
      where: { id: taskId },
      include: { sprint: true },
    });
    if (!t || (t.sprint && t.sprint.userId && t.sprint.userId !== userId)) {
      throw new Error("Unauthorized");
    }
  }

  return checklistRepo.createChecklist(taskId, payload);
}

async function getChecklistsForTask(taskId, userId) {
  if (userId) {
    const t = await prisma.task.findUnique({
      where: { id: taskId },
      include: { sprint: true },
    });
    if (!t || (t.sprint && t.sprint.userId && t.sprint.userId !== userId)) {
      throw new Error("Unauthorized");
    }
  }
  return checklistRepo.getChecklistsForTask(taskId);
}

async function updateChecklist(id, patch, userId) {
  const existing = await checklistRepo.getChecklist(id);
  if (!existing) throw new Error("Not found");
  if (userId) {
    const t = await prisma.task.findUnique({
      where: { id: existing.taskId },
      include: { sprint: true },
    });
    if (t && t.sprint && t.sprint.userId && t.sprint.userId !== userId)
      throw new Error("Unauthorized");
  }
  return checklistRepo.updateChecklist(id, patch);
}

async function deleteChecklist(id, userId) {
  const existing = await checklistRepo.getChecklist(id);
  if (!existing) return null;
  if (userId) {
    const t = await prisma.task.findUnique({
      where: { id: existing.taskId },
      include: { sprint: true },
    });
    if (t && t.sprint && t.sprint.userId && t.sprint.userId !== userId)
      throw new Error("Unauthorized");
  }
  return checklistRepo.deleteChecklist(id);
}

module.exports = {
  createChecklist,
  getChecklistsForTask,
  updateChecklist,
  deleteChecklist,
};
