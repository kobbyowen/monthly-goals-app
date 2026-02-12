import prisma from '@lib/prisma.js';

async function createChecklist(taskId, item) {
  const now = new Date().toISOString();
  const data = {
    id: item.id || undefined,
    taskId,
    title: item.title,
    completed: !!item.completed,
    completedAt: item.completed ? now : null,
    createdAt: now,
    updatedAt: now,
    position: item.position || null,
  };
  return prisma.taskChecklist.create({ data });
}

async function getChecklistsForTask(taskId) {
  return prisma.taskChecklist.findMany({
    where: { taskId },
    orderBy: { position: "asc" },
  });
}

async function getChecklist(id) {
  return prisma.taskChecklist.findUnique({ where: { id } });
}

async function updateChecklist(id, patch) {
  const now = new Date().toISOString();
  const data = {};
  if (Object.prototype.hasOwnProperty.call(patch, "title"))
    data.title = patch.title;
  if (Object.prototype.hasOwnProperty.call(patch, "completed")) {
    data.completed = !!patch.completed;
    data.completedAt = patch.completed ? now : null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "position"))
    data.position = patch.position;
  data.updatedAt = now;
  return prisma.taskChecklist.update({ where: { id }, data });
}

async function deleteChecklist(id) {
  return prisma.taskChecklist.delete({ where: { id } });
}

export default {
  createChecklist,
  getChecklistsForTask,
  getChecklist,
  updateChecklist,
  deleteChecklist,
};
