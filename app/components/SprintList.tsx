"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TaskCard from "./TaskCard";
import { mutate } from "swr";
import TaskDetails from "./TaskDetails";
import { withBase } from "../lib/api";

type Session = {
  id: string;
  startedAt?: string | null;
  endedAt?: string | null;
  duration?: number | null;
};

type Task = {
  id: string;
  name: string;
  plannedTime?: number;
  completed?: boolean;
  startedAt?: string | null;
  endedAt?: string | null;
  sessions?: Session[];
  timeSpent?: number;
  timeActuallySpent?: number;
};
type Sprint = {
  id: string;
  name: string;
  sprintLabel?: string;
  start: string;
  end: string;
  tasks: Task[];
};

function formatSeconds(total: number) {
  const sec = Math.floor(total % 60);
  const min = Math.floor((total / 60) % 60);
  const hrs = Math.floor(total / 3600);
  return [hrs, min, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

// No sample/dummy sprints: show an empty view when no sprints are provided.

type Persist = {
  tasks: Record<
    string,
    {
      elapsed: number;
      completed?: boolean;
      sessions?: number;
      firstStarted?: number;
      completedAt?: number;
    }
  >;
  running?: { taskId: string; startAt: number; sessionId?: string } | undefined;
};

function generateId(pref = "sess") {
  return `${pref}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function SprintList({ sprints }: { sprints?: Sprint[] } = {}) {
  const [localSprints, setLocalSprints] = useState<Sprint[] | undefined>(
    sprints,
  );
  const router = useRouter();
  const [addTaskFor, setAddTaskFor] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskEfforts, setNewTaskEfforts] = useState<number>(1);
  const [addingTask, setAddingTask] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [editingSprintName, setEditingSprintName] = useState<string>("");
  const [savingSprintName, setSavingSprintName] = useState(false);

  const [state, setState] = useState<Persist>({
    tasks: {},
    running: undefined,
  });
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [, forceRerender] = useState(0);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    tickRef.current = window.setInterval(
      () => forceRerender((n) => n + 1),
      1000,
    );
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  // On initial load or when sprints change, detect any open session from the
  // server data and mark it as running so timers resume after refresh.
  useEffect(() => {
    const source = localSprints && localSprints.length ? localSprints : sprints;
    if (!source || state.running) return;
    for (const s of source) {
      for (const t of s.tasks as Task[]) {
        const sessions = Array.isArray(t.sessions) ? t.sessions : [];
        const open = sessions.find((sess) => sess.startedAt && !sess.endedAt);
        if (open) {
          setState((prev) => ({
            ...prev,
            running: {
              taskId: t.id,
              startAt: new Date(open.startedAt as string).getTime(),
              sessionId: open.id,
            },
          }));
          return;
        }
      }
    }
  }, [localSprints, sprints, state.running]);

  function getTaskUiMeta(task: Task) {
    const stored = state.tasks[task.id] || {};
    const sessions = Array.isArray(task.sessions) ? task.sessions : [];

    const firstStartedComputed = sessions.reduce((min, s) => {
      if (!s.startedAt) return min;
      const ts = new Date(s.startedAt).getTime();
      return Math.min(min, ts);
    }, Number.POSITIVE_INFINITY);

    const firstStarted =
      stored.firstStarted ??
      (Number.isFinite(firstStartedComputed)
        ? firstStartedComputed
        : undefined);

    const completedAtFromTask = task.endedAt
      ? new Date(task.endedAt).getTime()
      : undefined;

    const completedAtFromSessions = sessions.reduce((max, s) => {
      if (!s.endedAt) return max;
      const ts = new Date(s.endedAt).getTime();
      return Math.max(max, ts);
    }, 0);

    const completedAt =
      stored.completedAt ??
      completedAtFromTask ??
      (completedAtFromSessions || undefined);

    const sessionsCount = stored.sessions ?? sessions.length;
    const completed = stored.completed ?? !!task.completed;

    return { firstStarted, completedAt, sessions: sessionsCount, completed };
  }

  async function startTask(taskId: string) {
    const now = Date.now();
    // create a session on the server
    const sessionId = generateId("session");
    try {
      const res = await fetch(withBase(`/api/tasks/${taskId}/sessions`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId,
          startedAt: new Date(now).toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      const created = await res.json();
      // update running state and then reconcile from backend
      setState((prev) => ({
        ...prev,
        running: { taskId, startAt: now, sessionId: created.id || sessionId },
      }));
      await syncTaskFromServer(taskId);
    } catch (err) {
      console.error("Could not start session", err);
      alert("Could not start session");
    }
  }

  async function stopTask(taskId: string) {
    const now = Date.now();
    try {
      // Look up the latest open session for this task from the server so we
      // never rely on client-only state for timing.
      const taskRes = await fetch(withBase(`/api/tasks/${taskId}`));
      if (!taskRes.ok) throw new Error("Failed to fetch task");
      const task = await taskRes.json();
      const sessions = Array.isArray(task.sessions) ? task.sessions : [];
      const open = sessions.find((s: any) => s.startedAt && !s.endedAt);
      if (open) {
        const started = new Date(open.startedAt).getTime();
        const duration = Math.max(0, Math.floor((now - started) / 1000));
        const res = await fetch(withBase(`/api/sessions/${open.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endedAt: new Date(now).toISOString(),
            duration,
          }),
        });
        if (!res.ok) throw new Error("Failed to end session");
      }
      // Clear running state then reconcile with backend
      setState((prev) => ({ ...prev, running: undefined }));
      await syncTaskFromServer(taskId);
    } catch (err) {
      console.error("Could not stop session", err);
      alert("Could not stop session");
    }
  }

  async function completeTask(taskId: string) {
    const now = Date.now();
    // if running, stop session first
    if (state.running && state.running.taskId === taskId) {
      await stopTask(taskId);
    }
    try {
      const res = await fetch(withBase(`/api/tasks/${taskId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: true,
          endedAt: new Date(now).toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to complete task");
      await syncTaskFromServer(taskId);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Could not complete task");
    }
  }

  async function syncTaskFromServer(taskId: string) {
    try {
      const res = await fetch(withBase(`/api/tasks/${taskId}`));
      if (!res.ok) throw new Error("Failed to fetch task");
      const t = await res.json();
      const sessions = Array.isArray(t.sessions) ? t.sessions : [];
      const baseElapsed = sessions.reduce(
        (acc: number, s: any) => acc + (s.duration || 0),
        0,
      );
      const runningAdd =
        state.running && state.running.taskId === taskId
          ? Math.floor((Date.now() - state.running.startAt) / 1000)
          : 0;
      setState((prev) => ({
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskId]: {
            elapsed: baseElapsed + runningAdd,
            sessions: sessions.length,
            firstStarted: sessions.length
              ? new Date(sessions[0].startedAt).getTime()
              : prev.tasks[taskId]?.firstStarted,
            completed: !!t.completed,
            completedAt: t.endedAt
              ? new Date(t.endedAt).getTime()
              : prev.tasks[taskId]?.completedAt,
          },
        },
      }));
    } catch (err) {
      console.error("syncTaskFromServer error", err);
    }
  }

  async function uncompleteTask(taskId: string) {
    try {
      const res = await fetch(withBase(`/api/tasks/${taskId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: false, endedAt: null }),
      });
      if (!res.ok) throw new Error("Failed to uncomplete task");
      await syncTaskFromServer(taskId);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Could not uncomplete task");
    }
  }

  async function deleteSprintById(sprintId: string) {
    if (
      !confirm(
        "Delete this sprint and all its tasks/sessions? This cannot be undone.",
      )
    )
      return;
    try {
      const res = await fetch(withBase(`/api/sprints/${sprintId}`), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete sprint");
      // update local view
      setLocalSprints((prev) =>
        (prev || []).filter((sp) => sp.id !== sprintId),
      );
      // refresh SWR caches
      await Promise.all([
        mutate(withBase("/api/epics")),
        mutate(withBase(`/api/sprints/${sprintId}`)),
      ]);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Could not delete sprint");
    }
  }

  function applyTaskUpdateLocally(
    taskId: string,
    partial: {
      name?: string;
    },
  ) {
    setLocalSprints((prev) => {
      if (!prev) return prev;
      return prev.map((s) => ({
        ...s,
        tasks: s.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                ...partial,
              }
            : t,
        ),
      }));
    });
  }

  function removeTaskLocally(taskId: string) {
    setLocalSprints((prev) => {
      if (!prev) return prev;
      return prev.map((s) => ({
        ...s,
        tasks: s.tasks.filter((t) => t.id !== taskId),
      }));
    });
  }

  function getElapsed(task: Task) {
    const sessions = Array.isArray(task.sessions) ? task.sessions : [];
    let base = sessions.reduce(
      (acc: number, s: any) => acc + (s.duration || 0),
      0,
    );

    // For non-completed tasks, if there is an open session, add live elapsed time since its start.
    const open = sessions.find((s: any) => s.startedAt && !s.endedAt);
    if (open && !task.completed) {
      const started = new Date(open.startedAt as string).getTime();
      base += Math.max(0, Math.floor((Date.now() - started) / 1000));
      return base;
    }

    // If no session durations exist, but we have timestamps on sessions
    // and/or the task itself, compute total as last end - first start.
    if (base === 0) {
      const startCandidates: number[] = [];
      const endCandidates: number[] = [];

      sessions.forEach((s: any) => {
        if (s.startedAt) {
          startCandidates.push(new Date(s.startedAt as string).getTime());
        }
        if (s.endedAt) {
          endCandidates.push(new Date(s.endedAt as string).getTime());
        }
      });

      if (task.startedAt) {
        startCandidates.push(new Date(task.startedAt).getTime());
      }
      if (task.endedAt) {
        endCandidates.push(new Date(task.endedAt).getTime());
      }

      if (startCandidates.length > 0 && endCandidates.length > 0) {
        const minStart = Math.min(...startCandidates);
        const maxEnd = Math.max(...endCandidates);
        const diffSec = Math.max(0, Math.floor((maxEnd - minStart) / 1000));
        if (diffSec > 0) {
          base = diffSec;
          return base;
        }
      }
    }

    // For completed tasks without usable timestamps/durations, fall back to task-level fields.
    if ((base || 0) === 0 && task.completed) {
      if (
        typeof task.timeActuallySpent === "number" &&
        task.timeActuallySpent > 0
      ) {
        base = task.timeActuallySpent;
      } else if (typeof task.timeSpent === "number" && task.timeSpent > 0) {
        base = task.timeSpent;
      }
    }

    return base || 0;
  }

  function sprintStatus(s: Sprint) {
    const tasks = s.tasks as Task[];
    const allCompleted =
      tasks.length > 0 &&
      tasks.every((t) => state.tasks[t.id]?.completed ?? t.completed);
    if (allCompleted) return "Completed";
    const anyRunning = tasks.some((t) => {
      const completed = state.tasks[t.id]?.completed ?? t.completed;
      if (completed) return false;
      const sessions = Array.isArray(t.sessions) ? t.sessions : [];
      const hasOpen = sessions.some((s) => s.startedAt && !s.endedAt);
      const hasProgress =
        hasOpen || sessions.some((s) => (s.duration || 0) > 0);
      return hasProgress;
    });
    if (anyRunning) return "In Progress";
    return "Not Started";
  }

  // use local or server-provided sprints; otherwise show empty list
  const displaySprints =
    localSprints && localSprints.length
      ? localSprints
      : sprints && sprints.length
        ? sprints
        : [];

  return (
    <div className="py-4 sm:py-6">
      <div className="space-y-6">
        {displaySprints.map((s) => {
          const status = sprintStatus(s);
          const tasks = s.tasks as Task[];
          const totalTasks = tasks.length || 0;
          const completedCount = tasks.filter((t) => {
            const meta = getTaskUiMeta(t);
            return meta.completed;
          }).length;
          const progress =
            totalTasks > 0
              ? Math.round((completedCount / totalTasks) * 100)
              : 0;

          const todo = tasks.filter((t) => {
            const meta = getTaskUiMeta(t);
            const sessions = Array.isArray(t.sessions) ? t.sessions : [];
            const hasOpen = sessions.some((s) => s.startedAt && !s.endedAt);
            const hasProgress =
              hasOpen || sessions.some((s) => (s.duration || 0) > 0);
            return !meta.completed && !hasProgress;
          });

          const inProgress = tasks.filter((t) => {
            const meta = getTaskUiMeta(t);
            const sessions = Array.isArray(t.sessions) ? t.sessions : [];
            const hasOpen = sessions.some((s) => s.startedAt && !s.endedAt);
            const hasProgress =
              hasOpen || sessions.some((s) => (s.duration || 0) > 0);
            return !meta.completed && hasProgress;
          });

          const done = tasks.filter((t) => getTaskUiMeta(t).completed);

          return (
            <section
              key={s.id}
              className="bg-white dark:bg-gray-950 rounded-2xl p-6 shadow-sm"
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {!editingSprintId || editingSprintId !== s.id ? (
                      <h2 className="text-lg font-semibold">
                        {s.sprintLabel || s.name}
                      </h2>
                    ) : (
                      <input
                        value={editingSprintName}
                        onChange={(e) => setEditingSprintName(e.target.value)}
                        className="text-lg font-semibold rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    )}
                    <span className="text-xs sm:text-sm text-gray-500">
                      {s.start} — {s.end}
                    </span>
                    <span
                      className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status === "Completed" ? "bg-green-100 text-green-800" : status === "In Progress" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="mt-2 w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 bg-blue-600 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600">
                  <span>{progress}% complete</span>
                  <span className="text-gray-400">{s.tasks.length} tasks</span>
                  {!editingSprintId || editingSprintId !== s.id ? (
                    <>
                      <button
                        onClick={() => {
                          setEditingSprintId(s.id);
                          setEditingSprintName(s.sprintLabel || s.name);
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteSprintById(s.id)}
                        className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs sm:text-sm text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          if (!editingSprintId) return;
                          setSavingSprintName(true);
                          try {
                            const res = await fetch(
                              `/api/sprints/${editingSprintId}`,
                              {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  sprintLabel: editingSprintName,
                                }),
                              },
                            );
                            if (!res.ok)
                              throw new Error("Failed to update sprint");
                            const updated = await res.json();
                            setLocalSprints((prev) => {
                              const copy = (prev && [...prev]) || [
                                ...(sprints || []),
                              ];
                              const idx = copy.findIndex(
                                (sp) => sp.id === editingSprintId,
                              );
                              if (idx >= 0)
                                copy[idx] = {
                                  ...copy[idx],
                                  sprintLabel:
                                    updated.sprintLabel || editingSprintName,
                                } as any;
                              return copy;
                            });
                            setEditingSprintId(null);
                            router.refresh();
                          } catch (err) {
                            console.error(err);
                            alert("Could not save sprint name");
                          } finally {
                            setSavingSprintName(false);
                          }
                        }}
                        disabled={savingSprintName}
                        className="rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
                      >
                        {savingSprintName ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingSprintId(null)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setAddTaskFor(s.id);
                      setNewTaskName("");
                      setNewTaskEfforts(1);
                    }}
                    className="rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Add New Task
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[220px] flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">To Do</div>
                    <div className="text-xs text-gray-400">{todo.length}</div>
                  </div>
                  <div className="space-y-3">
                    {todo.map((t) => {
                      const meta = getTaskUiMeta(t);
                      const sessionsArr = Array.isArray(t.sessions)
                        ? t.sessions
                        : [];
                      const hasOpen = sessionsArr.some(
                        (s) => s.startedAt && !s.endedAt,
                      );
                      return (
                        <TaskCard
                          key={t.id}
                          id={t.id}
                          name={t.name}
                          formattedElapsed={formatSeconds(getElapsed(t))}
                          plannedTimeSeconds={t.plannedTime}
                          firstStarted={meta.firstStarted}
                          completedAt={meta.completedAt}
                          sessions={meta.sessions || 0}
                          running={hasOpen}
                          completed={meta.completed}
                          onStart={startTask}
                          onPause={stopTask}
                          onEnd={completeTask}
                          onOpen={(id: string) => setOpenTaskId(id)}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[220px] flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">In Progress</div>
                    <div className="text-xs text-gray-400">
                      {inProgress.length}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {inProgress.map((t) => {
                      const meta = getTaskUiMeta(t);
                      const sessionsArr = Array.isArray(t.sessions)
                        ? t.sessions
                        : [];
                      const hasOpen = sessionsArr.some(
                        (s) => s.startedAt && !s.endedAt,
                      );
                      return (
                        <TaskCard
                          key={t.id}
                          id={t.id}
                          name={t.name}
                          formattedElapsed={formatSeconds(getElapsed(t))}
                          plannedTimeSeconds={t.plannedTime}
                          firstStarted={meta.firstStarted}
                          completedAt={meta.completedAt}
                          sessions={meta.sessions || 0}
                          running={hasOpen}
                          completed={meta.completed}
                          onStart={startTask}
                          onPause={stopTask}
                          onEnd={completeTask}
                          onOpen={(id: string) => setOpenTaskId(id)}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[220px] flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold">Done</div>
                    <div className="text-xs text-gray-400">{done.length}</div>
                  </div>
                  <div className="space-y-3">
                    {done.map((t) => {
                      const meta = getTaskUiMeta(t);
                      return (
                        <TaskCard
                          key={t.id}
                          id={t.id}
                          name={t.name}
                          formattedElapsed={formatSeconds(getElapsed(t))}
                          plannedTimeSeconds={t.plannedTime}
                          firstStarted={meta.firstStarted}
                          completedAt={meta.completedAt}
                          sessions={meta.sessions || 0}
                          running={false}
                          completed={meta.completed}
                          onStart={startTask}
                          onPause={stopTask}
                          onEnd={completeTask}
                          onUncomplete={uncompleteTask}
                          onOpen={(id: string) => setOpenTaskId(id)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {addTaskFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-40 backdrop-blur-sm"
            onClick={() => setAddTaskFor(null)}
          />
          <div className="relative z-50 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Add New Task</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Task name
                </label>
                <input
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Efforts (each = 2 hours)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newTaskEfforts}
                  onChange={(e) => setNewTaskEfforts(Number(e.target.value))}
                  className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setAddTaskFor(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!addTaskFor) return;
                  setAddingTask(true);
                  try {
                    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                    const plannedTime =
                      Math.max(0, Number(newTaskEfforts || 0)) * 2 * 3600;
                    const newTask: any = {
                      id: taskId,
                      name: newTaskName || "Untitled",
                      plannedTime,
                    };

                    const postRes = await fetch(
                      withBase(`/api/sprints/${addTaskFor}/tasks`),
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(newTask),
                      },
                    );
                    if (!postRes.ok) throw new Error("Failed to create task");
                    await postRes.json();

                    // refresh server data and local view via SWR so parent hooks update
                    await Promise.all([
                      mutate(withBase(`/api/sprints/${addTaskFor}`)),
                      mutate(withBase("/api/epics")),
                    ]);
                    setAddTaskFor(null);
                  } catch (err) {
                    console.error(err);
                    alert("Could not add task");
                  } finally {
                    setAddingTask(false);
                  }
                }}
                disabled={addingTask}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${addingTask ? "bg-emerald-600 opacity-60 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {addingTask ? "Adding..." : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}
      {openTaskId && (
        <TaskDetails
          taskId={openTaskId}
          onClose={() => setOpenTaskId(null)}
          onUpdated={(task) =>
            applyTaskUpdateLocally(task.id, { name: task.name })
          }
          onDeleted={(id) => {
            removeTaskLocally(id);
            setOpenTaskId(null);
          }}
        />
      )}
    </div>
  );
}
