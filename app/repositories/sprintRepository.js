const prisma = require("@lib/prisma.js");

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

  // If child sprints were provided (e.g., creating an epic with initial sprints),
  // persist them as separate Sprint rows linked to this epic.
  const sprintNames = Array.isArray(sprints) ? sprints : [];
  if (sprintNames.length) {
    const children = await Promise.all(
      sprintNames.map(async (sn) => {
        const childId = ensureId("sprint");
        const baseName =
          typeof sn === "string" ? sn : (sn && sn.name) || "Sprint";
        // If caller passed structured sprint objects (e.g., with weekOfMonth), preserve them.
        const weekOfMonth =
          typeof sn === "object" && sn && "weekOfMonth" in sn
            ? sn.weekOfMonth
            : undefined;
        const childData = {
          id: childId,
          name: baseName,
          epicId: created.id,
          kind: "sprint",
          userId: s.userId,
          weekOfMonth,
        };
        return prisma.sprint.create({ data: convertSprintInput(childData) });
      }),
    );
    // Attach children to returned object for convenience
    return { ...created, sprints: children };
  }

  return created;
}

async function listSprints(userId, kind) {
  const where = {};
  if (userId) where.userId = userId;
  if (kind) where.kind = kind;
  return prisma.sprint.findMany({
    where,
    include: { tasks: { include: { sessions: true, checklists: true } } },
  });
}

async function getSprint(id, userId) {
  const where = userId ? { id, userId } : { id };
  const sprint = await prisma.sprint.findFirst({
    where,
    include: { tasks: { include: { sessions: true, checklists: true } } },
  });
  if (!sprint) return null;
  // If this row represents an epic, also load its child sprints (kind='sprint')
  if (sprint.kind === "epic") {
    const children = await prisma.sprint.findMany({
      where: { epicId: sprint.id },
      include: { tasks: { include: { sessions: true, checklists: true } } },
    });
    // compute aggregated metrics across epic + children
    const allTasks = [...(sprint.tasks || [])];
    for (const c of children) {
      (c.tasks || []).forEach((t) => allTasks.push(t));
    }

    let totalPlanned = 0;
    let totalUsed = 0;
    let checklistTotal = 0;
    let checklistCompleted = 0;

    for (const t of allTasks) {
      totalPlanned += typeof t.plannedTime === "number" ? t.plannedTime : 0;
      const sessions = t.sessions || [];
      const sessSum = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);

      // Effort used: completed tasks should contribute their total effort
      // (prefer session sums or recorded actuals, fallback to plannedTime).
      // In-progress tasks only contribute their current session durations.
      if (t.completed) {
        if (sessSum > 0) totalUsed += sessSum;
        else if (
          typeof t.timeActuallySpent === "number" &&
          t.timeActuallySpent > 0
        )
          totalUsed += t.timeActuallySpent;
        else if (typeof t.timeSpent === "number" && t.timeSpent > 0)
          totalUsed += t.timeSpent;
        else totalUsed += typeof t.plannedTime === "number" ? t.plannedTime : 0;
      } else {
        // not completed: count only sessions (in-progress work)
        if (sessSum > 0) totalUsed += sessSum;
      }

      const cls = t.checklists || [];
      checklistTotal += cls.length;
      checklistCompleted += cls.filter((c) => c.completed).length;
    }

    return {
      ...sprint,
      sprints: children,
      metrics: { totalPlanned, totalUsed, checklistTotal, checklistCompleted },
    };
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
