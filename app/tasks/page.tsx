"use client";

import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import TaskDetails from "../components/TaskDetails";
import Checklist from "../components/Checklist";
import { useEpics } from "../hooks/useEpics";
import { withBase } from "../lib/api";
import { toast } from "../lib/ui";

export default function TasksPage() {
  const { epics, mutate } = useEpics();
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(
    epics && epics.length ? epics[0].id : null,
  );
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedEpicId && epics && epics.length)
      setSelectedEpicId(epics[0].id);
  }, [epics, selectedEpicId]);

  const selectedEpic = useMemo(
    () => epics.find((e: any) => e.id === selectedEpicId) || null,
    [epics, selectedEpicId],
  );

  // Flatten tasks across epic + its child sprints
  const tasks = useMemo(() => {
    if (!selectedEpic) return [];
    // Copy epic-level tasks
    const base = Array.isArray(selectedEpic.tasks)
      ? selectedEpic.tasks.map((t: any) => ({
          ...(t || {}),
          sprint: undefined,
        }))
      : [];

    // If epic has child sprints, attach their tasks and mark sprint info
    const childSprints = Array.isArray((selectedEpic as any).sprints)
      ? (selectedEpic as any).sprints
      : [];
    for (const s of childSprints) {
      if (Array.isArray(s.tasks)) {
        for (const t of s.tasks) {
          base.push({
            ...(t || {}),
            sprint: s,
            sprintLabel: s.sprintLabel || s.name,
          });
        }
      }
    }

    // For any remaining tasks that reference a sprintId but don't have sprintLabel,
    // look up the sprint from childSprints and attach its label.
    for (const t of base) {
      if (!t.sprintLabel && t.sprintId) {
        const s = childSprints.find((cs: any) => cs.id === t.sprintId);
        if (s) t.sprintLabel = s.sprintLabel || s.name;
      }
    }

    return base;
  }, [selectedEpic]);

  function getTaskUiMeta(task: any) {
    const sessions = Array.isArray(task.sessions) ? task.sessions : [];
    const hasOpen = sessions.some((s: any) => s.startedAt && !s.endedAt);
    const hasProgress =
      hasOpen || sessions.some((s: any) => (s.duration || 0) > 0);
    const completed = !!task.completed;
    return { hasProgress, completed };
  }

  function getSprintLabel(task: any) {
    console.log({ task });
    if (!task) return "";
    return (
      task.sprintLabel ||
      (task.sprint && (task.sprint.sprintLabel || task.sprint.name)) ||
      task.sprintName ||
      ""
    );
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = tasks || [];
    if (q)
      list = list.filter((t: any) => (t.name || "").toLowerCase().includes(q));
    const inProgress = list.filter((t: any) => {
      const m = getTaskUiMeta(t);
      return !m.completed && m.hasProgress;
    });
    const todo = list.filter((t: any) => {
      const m = getTaskUiMeta(t);
      return !m.completed && !m.hasProgress;
    });
    const done = list.filter((t: any) => getTaskUiMeta(t).completed);
    return { inProgress, todo, done };
  }, [tasks, search]);

  async function startTask(taskId: string) {
    try {
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const res = await fetch(withBase(`/api/tasks/${taskId}/sessions`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: sessionId,
          startedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to start session");
      await mutate();
    } catch (err) {
      console.error(err);
      toast("Could not start task", "error");
    }
  }

  async function stopTask(taskId: string) {
    try {
      const taskRes = await fetch(withBase(`/api/tasks/${taskId}`));
      if (!taskRes.ok) throw new Error("Failed to fetch task");
      const task = await taskRes.json();
      const sessions = Array.isArray(task.sessions) ? task.sessions : [];
      const open = sessions.find((s: any) => s.startedAt && !s.endedAt);
      if (open) {
        const now = Date.now();
        const started = new Date(open.startedAt).getTime();
        const duration = Math.max(0, Math.floor((now - started) / 1000));
        const res = await fetch(withBase(`/api/sessions/${open.id}`), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endedAt: new Date().toISOString(), duration }),
        });
        if (!res.ok) throw new Error("Failed to end session");
      }
      await mutate();
    } catch (err) {
      console.error(err);
      toast("Could not stop task", "error");
    }
  }

  async function completeTask(taskId: string) {
    try {
      const now = new Date().toISOString();
      const res = await fetch(withBase(`/api/tasks/${taskId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, endedAt: now }),
      });
      if (!res.ok) throw new Error("Failed to complete task");
      await mutate();
    } catch (err) {
      console.error(err);
      toast("Could not complete task", "error");
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((s) => ({ ...(s || {}), [id]: !s?.[id] }));
  }

  return (
    <div className="min-h-screen flex bg-slate-100">
      <Sidebar
        sprints={epics}
        onCreated={(created: any) =>
          mutate((prev: any[] | undefined) => [created, ...(prev || [])], false)
        }
      />

      <main className="flex-1 h-screen overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-4 pb-3 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-slate-900 truncate">
                All Tasks
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="sr-only">Search</label>
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-24 sm:w-48 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
              />

              <label className="sr-only">Epic</label>
              <div className="relative">
                <select
                  className="appearance-none rounded-md border border-slate-200 bg-white px-2 py-1 pr-6 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
                  value={selectedEpicId || ""}
                  onChange={(e) => setSelectedEpicId(e.target.value || null)}
                >
                  {epics.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center text-slate-400">
                  ▾
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {selectedEpic ? (
              <>
                {/* In Progress */}
                {filtered.inProgress.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-800">
                        In Progress
                      </h2>
                      <span className="text-xs text-slate-500">
                        {filtered.inProgress.length} tasks
                      </span>
                    </div>

                    <div className="space-y-2">
                      {filtered.inProgress.map((t: any) => {
                        const sessions = Array.isArray(t.sessions)
                          ? t.sessions
                          : [];
                        const now = Date.now();
                        const base = sessions.reduce(
                          (acc: number, s: any) => acc + (s.duration || 0),
                          0,
                        );
                        const open = sessions.find(
                          (s: any) => s.startedAt && !s.endedAt,
                        );
                        const used = open
                          ? base +
                            Math.max(
                              0,
                              Math.floor(
                                (now - new Date(open.startedAt).getTime()) /
                                  1000,
                              ),
                            )
                          : base;
                        const est = t.plannedTime || 0;
                        const checklistTotal = Array.isArray(
                          (t as any).checklists,
                        )
                          ? (t as any).checklists.length
                          : 0;
                        const checklistDone = Array.isArray(
                          (t as any).checklists,
                        )
                          ? (t as any).checklists.filter(
                              (c: any) => c.completed,
                            ).length
                          : 0;

                        const borderClass = "border-l-8 border-l-yellow-400";
                        const sprintLabel = getSprintLabel(t);
                        const leftMeta =
                          `${t.epicName || selectedEpic?.name || ""}${sprintLabel ? " · " + sprintLabel : ""}`.trim();

                        return (
                          <div
                            key={t.id}
                            className={`rounded-lg border border-slate-200 ${borderClass} bg-white px-4 ${expandedIds[t.id] ? "py-3" : "py-2"} cursor-pointer`}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleExpanded(t.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") toggleExpanded(t.id);
                            }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div>
                                  <h3 className="text-sm font-bold text-slate-900 truncate">
                                    {t.name}
                                  </h3>
                                  {leftMeta ? (
                                    <p className="mt-0.5 text-[11px] text-slate-500">
                                      {leftMeta}
                                    </p>
                                  ) : null}
                                  <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-500">
                                    <span>
                                      {Math.floor(used / 60)}m /{" "}
                                      {Math.round(est / 3600)}h
                                    </span>
                                    <span className="font-medium text-emerald-600">
                                      {checklistDone} / {checklistTotal}{" "}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {open ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      stopTask(t.id);
                                    }}
                                    className="rounded-md bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700"
                                  >
                                    Stop
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startTask(t.id);
                                    }}
                                    className="rounded-md bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700"
                                  >
                                    Resume
                                  </button>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    completeTask(t.id);
                                  }}
                                  className="rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white"
                                >
                                  Complete
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpanded(t.id);
                                  }}
                                  className={`ml-1 text-slate-400 text-sm transform transition ${expandedIds[t.id] ? "rotate-180" : ""}`}
                                  aria-expanded={!!expandedIds[t.id]}
                                  aria-controls={`checklist-${t.id}`}
                                >
                                  ⌄
                                </button>
                              </div>
                            </div>

                            <div
                              id={`checklist-${t.id}`}
                              className={`border-t border-slate-100 pt-3 space-y-2 overflow-hidden transition-all duration-200 ${expandedIds[t.id] ? "mt-4 max-h-96 opacity-100" : "mt-0 max-h-0 opacity-0"}`}
                              aria-hidden={!expandedIds[t.id]}
                            >
                              <Checklist taskId={t.id} compact />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Todo */}
                {filtered.todo.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-800">
                        Todo
                      </h2>
                      <span className="text-xs text-slate-500">
                        {filtered.todo.length} tasks
                      </span>
                    </div>

                    <div className="space-y-2">
                      {filtered.todo.map((t: any) => {
                        const sessions = Array.isArray(t.sessions)
                          ? t.sessions
                          : [];
                        const base = sessions.reduce(
                          (acc: number, s: any) => acc + (s.duration || 0),
                          0,
                        );
                        const est = t.plannedTime || 0;
                        const checklistTotal = Array.isArray(
                          (t as any).checklists,
                        )
                          ? (t as any).checklists.length
                          : 0;
                        const checklistDone = Array.isArray(
                          (t as any).checklists,
                        )
                          ? (t as any).checklists.filter(
                              (c: any) => c.completed,
                            ).length
                          : 0;

                        const borderClass = "border-l-8 border-l-slate-300";
                        const sprintLabel = getSprintLabel(t);
                        const leftMeta =
                          `${t.epicName || selectedEpic?.name || ""}${sprintLabel ? " · " + sprintLabel : ""}`.trim();

                        return (
                          <div
                            key={t.id}
                            className={`rounded-lg border border-slate-200 ${borderClass} bg-white px-4 ${expandedIds[t.id] ? "py-3" : "py-2"} cursor-pointer`}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleExpanded(t.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") toggleExpanded(t.id);
                            }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-sm font-bold text-slate-900 truncate">
                                  {t.name}
                                </h3>
                                {leftMeta ? (
                                  <p className="mt-0.5 text-[11px] text-slate-500">
                                    {leftMeta}
                                  </p>
                                ) : null}

                                <div className="mt-1 text-[11px] text-slate-500">
                                  {Math.floor(base / 60)}m /{" "}
                                  {Math.round(est / 3600)}h ·{" "}
                                  <span className="text-emerald-600 font-medium">
                                    {checklistDone} / {checklistTotal}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startTask(t.id);
                                  }}
                                  className="rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white"
                                >
                                  Start
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpanded(t.id);
                                  }}
                                  className={`ml-1 text-slate-400 text-sm transform transition ${expandedIds[t.id] ? "rotate-180" : ""}`}
                                  aria-expanded={!!expandedIds[t.id]}
                                  aria-controls={`checklist-${t.id}`}
                                >
                                  ⌄
                                </button>
                              </div>
                            </div>

                            <div
                              id={`checklist-${t.id}`}
                              className={`border-t border-slate-100 pt-3 space-y-2 overflow-hidden transition-all duration-200 ${expandedIds[t.id] ? "mt-4 max-h-96 opacity-100" : "mt-0 max-h-0 opacity-0"}`}
                              aria-hidden={!expandedIds[t.id]}
                            >
                              <Checklist taskId={t.id} compact />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Completed */}
                {filtered.done.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-slate-800">
                        Completed
                      </h2>
                      <span className="text-xs text-slate-500">
                        {filtered.done.length} tasks
                      </span>
                    </div>

                    <div className="space-y-2">
                      {filtered.done.map((t: any) => {
                        const sessions = Array.isArray(t.sessions)
                          ? t.sessions
                          : [];
                        const base = sessions.reduce(
                          (acc: number, s: any) => acc + (s.duration || 0),
                          0,
                        );
                        const est = t.plannedTime || 0;
                        const checklistTotal = Array.isArray(
                          (t as any).checklists,
                        )
                          ? (t as any).checklists.length
                          : 0;
                        const checklistDone = Array.isArray(
                          (t as any).checklists,
                        )
                          ? (t as any).checklists.filter(
                              (c: any) => c.completed,
                            ).length
                          : 0;

                        const borderClass = "border-l-8 border-l-emerald-400";
                        const sprintLabel = getSprintLabel(t);
                        const leftMeta =
                          `${t.epicName || selectedEpic?.name || ""}${sprintLabel ? " · " + sprintLabel : ""}`.trim();

                        return (
                          <div
                            key={t.id}
                            className={`rounded-lg border border-slate-200 ${borderClass} bg-white px-4 ${expandedIds[t.id] ? "py-3" : "py-2"} opacity-90 cursor-pointer`}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleExpanded(t.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") toggleExpanded(t.id);
                            }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h3 className="text-sm font-bold text-slate-900 truncate">
                                  {t.name}
                                </h3>
                                {leftMeta ? (
                                  <p className="mt-0.5 text-[11px] text-slate-500">
                                    {leftMeta}
                                  </p>
                                ) : null}
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {Math.floor(base / 3600)}h{" "}
                                  {Math.floor((base % 3600) / 60)}m /{" "}
                                  {Math.round(est / 3600)}h ·{" "}
                                  <span className="text-emerald-600 font-medium">
                                    {checklistDone} / {checklistTotal}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button className="rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white">
                                  Done
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpanded(t.id);
                                  }}
                                  className={`ml-1 text-slate-400 text-sm transform transition ${expandedIds[t.id] ? "rotate-180" : ""}`}
                                  aria-expanded={!!expandedIds[t.id]}
                                  aria-controls={`checklist-${t.id}`}
                                >
                                  ⌄
                                </button>
                              </div>
                            </div>
                            <div
                              id={`checklist-${t.id}`}
                              className={`border-t border-slate-100 pt-3 space-y-2 overflow-hidden transition-all duration-200 ${expandedIds[t.id] ? "mt-4 max-h-96 opacity-100" : "mt-0 max-h-0 opacity-0"}`}
                              aria-hidden={!expandedIds[t.id]}
                            >
                              <Checklist taskId={t.id} compact />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {filtered.inProgress.length === 0 &&
                  filtered.todo.length === 0 &&
                  filtered.done.length === 0 && (
                    <div className="text-center text-sm text-slate-500">
                      No tasks found.
                    </div>
                  )}
              </>
            ) : (
              <div className="text-center text-sm text-slate-500">
                No epics available.
              </div>
            )}
          </div>

          {openTaskId && (
            <TaskDetails
              taskId={openTaskId}
              onClose={() => setOpenTaskId(null)}
              onUpdated={() => mutate()}
              onDeleted={() => mutate()}
            />
          )}
        </div>
      </main>
    </div>
  );
}
