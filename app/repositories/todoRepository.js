import prisma from "@lib/prisma.js";
const { randomUUID } = require("crypto");

const VALID_STATUS = new Set(["todo", "running", "paused", "completed"]);

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function getCurrentMonthDateRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    fromDate: formatLocalDate(first),
    toDate: formatLocalDate(last),
  };
}

function normalizeDueDate(input) {
  if (!input) throw new Error("dueDate is required");
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid dueDate");
  return parsed.toISOString().slice(0, 10);
}

function normalizeTimestamp(input) {
  if (!input) return null;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime()))
    throw new Error("Invalid timestamp value");
  return parsed.toISOString();
}

function applyStatusAndCompletion(payload, data, { partial }) {
  const hasStatus = Object.prototype.hasOwnProperty.call(data, "status");
  const hasCompleted = Object.prototype.hasOwnProperty.call(data, "completed");
  const hasCompletedAt = Object.prototype.hasOwnProperty.call(
    data,
    "completedAt",
  );

  if (hasStatus) {
    if (!VALID_STATUS.has(data.status)) {
      throw new Error("Invalid status");
    }
    payload.status = data.status;
  }

  if (hasCompleted) {
    payload.completed = !!data.completed;
  }

  const effectiveStatus = hasStatus ? payload.status : undefined;
  const effectiveCompleted = hasCompleted
    ? payload.completed
    : effectiveStatus === "completed"
      ? true
      : partial
        ? undefined
        : false;

  if (
    effectiveStatus &&
    effectiveStatus !== "completed" &&
    effectiveCompleted
  ) {
    throw new Error("completed=true requires status='completed'");
  }

  if (effectiveCompleted !== undefined) {
    payload.completed = effectiveCompleted;
  }

  if (effectiveCompleted === true) {
    if (!hasStatus) payload.status = "completed";
    payload.completedAt = hasCompletedAt
      ? normalizeTimestamp(data.completedAt)
      : new Date().toISOString();
  } else if (effectiveCompleted === false) {
    if (hasCompletedAt)
      payload.completedAt = normalizeTimestamp(data.completedAt);
    else if (!partial || hasCompleted) payload.completedAt = null;
  } else if (hasCompletedAt) {
    payload.completedAt = normalizeTimestamp(data.completedAt);
  }
}

async function getTaskForValidation(taskId) {
  return prisma.task.findUnique({
    where: { id: taskId },
    include: { sprint: true },
  });
}

async function assertSprintOwnership(sprintId, userId) {
  if (!userId) return;
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint || (sprint.userId && sprint.userId !== userId)) {
    throw new Error("Unauthorized");
  }
}

async function createTodo(data, userId) {
  const payload = {};

  const taskId = data.taskId || null;
  let task = null;
  if (taskId) {
    task = await getTaskForValidation(taskId);
    if (!task) throw new Error("Task not found");
    if (
      userId &&
      task.sprint &&
      task.sprint.userId &&
      task.sprint.userId !== userId
    ) {
      throw new Error("Unauthorized");
    }
    payload.taskId = taskId;
  }

  const sprintId = data.sprintId || task?.sprintId;
  if (!sprintId) throw new Error("sprintId is required");
  await assertSprintOwnership(sprintId, userId);

  if (task && task.sprintId !== sprintId) {
    throw new Error("taskId does not belong to sprintId");
  }

  if (!data.title || !String(data.title).trim())
    throw new Error("title is required");

  payload.sprintId = sprintId;
  payload.title = String(data.title).trim();
  payload.dueDate = normalizeDueDate(data.dueDate);

  if (Object.prototype.hasOwnProperty.call(data, "plannedHours")) {
    payload.plannedHours = Number(data.plannedHours) || 0;
  }
  if (Object.prototype.hasOwnProperty.call(data, "usedSeconds")) {
    payload.usedSeconds = Number(data.usedSeconds) || 0;
  }
  if (Object.prototype.hasOwnProperty.call(data, "startedAt")) {
    payload.startedAt = normalizeTimestamp(data.startedAt);
  }
  if (Object.prototype.hasOwnProperty.call(data, "currentSessionStartedAt")) {
    payload.currentSessionStartedAt = normalizeTimestamp(
      data.currentSessionStartedAt,
    );
  }
  if (Object.prototype.hasOwnProperty.call(data, "priority")) {
    payload.priority = String(data.priority || "medium");
  }
  if (Object.prototype.hasOwnProperty.call(data, "sortOrder")) {
    payload.sortOrder = Number(data.sortOrder) || 0;
  }

  applyStatusAndCompletion(payload, data, { partial: false });

  // If completed at creation and tied to a task, create the session transactionally
  if (payload.completed === true && payload.taskId) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.todoTask.create({ data: payload });

      try {
        const task = await tx.task.findUnique({
          where: { id: payload.taskId },
          include: { sprint: true },
        });
        if (!task) throw new Error("Task not found");
        if (
          userId &&
          task.sprint &&
          task.sprint.userId &&
          task.sprint.userId !== userId
        ) {
          throw new Error("Unauthorized");
        }

        const completedAt = payload.completedAt || new Date().toISOString();
        const plannedHours = payload.plannedHours ?? 0;
        const duration = Math.max(0, Math.round((plannedHours || 0) * 3600));
        const startedAt = new Date(
          new Date(completedAt).getTime() - duration * 1000,
        ).toISOString();

        const sess = await tx.session.create({
          data: {
            id: randomUUID(),
            taskId: payload.taskId,
            startedAt: startedAt,
            endedAt: completedAt,
            duration: duration,
            notes: `Auto-created from todo ${created.id}`,
          },
        });

        if (task && !task.startedAt && sess.startedAt) {
          await tx.task.update({
            where: { id: payload.taskId },
            data: { startedAt: sess.startedAt, completed: false },
          });
        }
      } catch (e) {
        // If session creation fails, rethrow to rollback transaction and avoid leaving todo marked completed without session
        throw e;
      }

      return tx.todoTask.findUnique({
        where: { id: created.id },
        include: { task: true },
      });
    });
  }

  return prisma.todoTask.create({ data: payload, include: { task: true } });
}

async function getTodo(id, userId) {
  const todo = await prisma.todoTask.findUnique({
    where: { id },
    include: { sprint: true, task: true },
  });
  if (!todo) return null;
  if (
    userId &&
    todo.sprint &&
    todo.sprint.userId &&
    todo.sprint.userId !== userId
  ) {
    return null;
  }
  delete todo.sprint;
  return todo;
}

function resolveDateRange(fromDate, toDate) {
  const fallback = getCurrentMonthDateRange();
  const from = fromDate ? normalizeDueDate(fromDate) : fallback.fromDate;
  const to = toDate ? normalizeDueDate(toDate) : fallback.toDate;
  if (from > to) throw new Error("fromDate must be <= toDate");
  return { fromDate: from, toDate: to };
}

async function listTodos(filters, userId) {
  const { fromDate, toDate } = resolveDateRange(
    filters?.fromDate,
    filters?.toDate,
  );

  const where = {
    dueDate: {
      gte: fromDate,
      lte: toDate,
    },
  };

  if (userId) where.sprint = { userId };
  if (filters?.sprintId) where.sprintId = filters.sprintId;
  if (filters?.taskId) where.taskId = filters.taskId;
  if (filters?.status) {
    if (!VALID_STATUS.has(filters.status)) throw new Error("Invalid status");
    where.status = filters.status;
  }
  if (typeof filters?.completed === "boolean")
    where.completed = filters.completed;

  const items = await prisma.todoTask.findMany({
    where,
    include: { task: true },
    orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return { items, fromDate, toDate };
}

async function updateTodo(id, data, userId) {
  const existing = await prisma.todoTask.findUnique({
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

  const payload = {};
  if (Object.prototype.hasOwnProperty.call(data, "title")) {
    if (!String(data.title || "").trim())
      throw new Error("title cannot be empty");
    payload.title = String(data.title).trim();
  }
  if (Object.prototype.hasOwnProperty.call(data, "dueDate")) {
    payload.dueDate = normalizeDueDate(data.dueDate);
  }
  if (Object.prototype.hasOwnProperty.call(data, "plannedHours")) {
    payload.plannedHours = Number(data.plannedHours) || 0;
  }
  if (Object.prototype.hasOwnProperty.call(data, "usedSeconds")) {
    payload.usedSeconds = Number(data.usedSeconds) || 0;
  }
  if (Object.prototype.hasOwnProperty.call(data, "startedAt")) {
    payload.startedAt = normalizeTimestamp(data.startedAt);
  }
  if (Object.prototype.hasOwnProperty.call(data, "currentSessionStartedAt")) {
    payload.currentSessionStartedAt = normalizeTimestamp(
      data.currentSessionStartedAt,
    );
  }
  if (Object.prototype.hasOwnProperty.call(data, "priority")) {
    payload.priority = String(data.priority || "medium");
  }
  if (Object.prototype.hasOwnProperty.call(data, "sortOrder")) {
    payload.sortOrder = Number(data.sortOrder) || 0;
  }

  if (Object.prototype.hasOwnProperty.call(data, "taskId")) {
    if (!data.taskId) {
      payload.taskId = null;
    } else {
      const task = await getTaskForValidation(data.taskId);
      if (!task) throw new Error("Task not found");
      if (task.sprintId !== existing.sprintId) {
        throw new Error("taskId does not belong to todo sprint");
      }
      if (
        userId &&
        task.sprint &&
        task.sprint.userId &&
        task.sprint.userId !== userId
      ) {
        throw new Error("Unauthorized");
      }
      payload.taskId = data.taskId;
    }
  }

  applyStatusAndCompletion(payload, data, { partial: true });

  // If marking completed now (and previously not completed) and tied to a task,
  // perform update + session creation in a transaction so both succeed or both rollback.
  const willBeCompleted = payload.completed === true;
  const previouslyCompleted = !!existing.completed;

  if (willBeCompleted && !previouslyCompleted && existing.taskId) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.todoTask.update({
        where: { id },
        data: payload,
      });

      try {
        const task = await tx.task.findUnique({
          where: { id: existing.taskId },
          include: { sprint: true },
        });
        if (!task) throw new Error("Task not found");
        if (
          userId &&
          task.sprint &&
          task.sprint.userId &&
          task.sprint.userId !== userId
        ) {
          throw new Error("Unauthorized");
        }

        const completedAt = payload.completedAt || new Date().toISOString();
        const plannedHours = payload.plannedHours ?? existing.plannedHours ?? 0;
        const duration = Math.max(0, Math.round((plannedHours || 0) * 3600));
        const startedAt = new Date(
          new Date(completedAt).getTime() - duration * 1000,
        ).toISOString();

        const sess = await tx.session.create({
          data: {
            id: randomUUID(),
            taskId: existing.taskId,
            startedAt: startedAt,
            endedAt: completedAt,
            duration: duration,
            notes: `Auto-created from todo ${id}`,
          },
        });

        if (task && !task.startedAt && sess.startedAt) {
          await tx.task.update({
            where: { id: existing.taskId },
            data: { startedAt: sess.startedAt, completed: false },
          });
        }
      } catch (e) {
        throw e;
      }

      return tx.todoTask.findUnique({
        where: { id: updated.id },
        include: { task: true },
      });
    });
  }

  // If undoing a completed todo (marking completed=false) and previously it was completed,
  // remove any session that was auto-created for this todo.
  if (!willBeCompleted && previouslyCompleted && existing.taskId) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.todoTask.update({
        where: { id },
        data: payload,
      });

      try {
        // Sessions created by the todo use a notes string 'Auto-created from todo <id>'
        await tx.session.deleteMany({
          where: { notes: `Auto-created from todo ${id}` },
        });
      } catch (e) {
        // If deletion fails, rethrow to rollback transaction
        throw e;
      }

      return tx.todoTask.findUnique({
        where: { id: updated.id },
        include: { task: true },
      });
    });
  }

  return prisma.todoTask.update({
    where: { id },
    data: payload,
    include: { task: true },
  });
}

async function deleteTodo(id, userId) {
  const existing = await prisma.todoTask.findUnique({
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
  return prisma.todoTask.delete({ where: { id } });
}

export { createTodo, getTodo, listTodos, updateTodo, deleteTodo };
