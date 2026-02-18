"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import SemiMiniTaskCard from "../components/SemiMiniTaskCard";
import useRootEpicStore from "@stores/rootEpicStore";
import { useShallow } from "zustand/shallow";
import type { Task as ApiTask, Epic } from "@lib/api/types";

export default function TasksPage() {
  const [query, setQuery] = useState("");
  const [filterEpic, setFilterEpic] = useState<string>("");
  const [filterSprint, setFilterSprint] = useState<string>("");
  const epics = useRootEpicStore(
    useShallow((s) => s.epics.allIds.map((id) => s.epics.byId[id])),
  );
  const tasks = useRootEpicStore(
    useShallow((s) => s.tasks.allIds.map((id) => s.tasks.byId[id])),
  );
  const getSessionsByTask = useRootEpicStore(
    useShallow((s) => s.getSessionsByTask),
  );
  const getSprintsByEpic = useRootEpicStore(
    useShallow((s) => s.getSprintsByEpic),
  );
  const storeVersion = useRootEpicStore((s) => s._version);

  const { inProgressTasks, todoTasks, completedTasks } = React.useMemo(() => {
    const inProgress: typeof tasks = [];
    const todo: typeof tasks = [];
    const done: typeof tasks = [];

    const q = (query || "").trim().toLowerCase();
    // If filtering by epic, include tasks directly linked to the epic OR tasks whose sprint belongs to the epic
    const sprintIdsForEpic = filterEpic
      ? new Set(
          (getSprintsByEpic ? getSprintsByEpic(filterEpic) : []).map(
            (s: any) => s.id,
          ),
        )
      : new Set<string>();

    const filtered = (tasks || []).filter((t) => {
      if (!t) return false;
      if (filterEpic) {
        const taskEpic = (t as any).epicId;
        const taskSprintId = (t as any).sprintId;
        const inEpic =
          taskEpic === filterEpic ||
          (taskSprintId && sprintIdsForEpic.has(taskSprintId));
        if (!inEpic) return false;
      }
      if (filterSprint && (t as any).sprintId !== filterSprint) return false;
      if (!q) return true;
      const name = ((t as any).name || (t as any).title || "")
        .toString()
        .toLowerCase();
      const epicName = ((t as any).epicName || "").toString().toLowerCase();
      return name.includes(q) || epicName.includes(q);
    });

    for (const t of filtered) {
      const sess = getSessionsByTask ? getSessionsByTask(t.id) : [];
      const hasOpen =
        Array.isArray(sess) && sess.some((s) => s.startedAt && !s.endedAt);
      const hasProgress =
        hasOpen ||
        (Array.isArray(sess) &&
          sess.some((s) => (s.seconds ?? (s as any).duration ?? 0) > 0));
      const completed = !!(t as any).completed;

      if (completed) done.push(t);
      else if (hasProgress) inProgress.push(t);
      else todo.push(t);
    }

    return {
      inProgressTasks: inProgress,
      todoTasks: todo,
      completedTasks: done,
    };
  }, [
    tasks,
    getSessionsByTask,
    query,
    filterEpic,
    filterSprint,
    getSprintsByEpic,
    storeVersion,
  ]);

  // ensure stable client rendering when store initially empty
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // initialize default epic + sprint when store populates
  useEffect(() => {
    if (
      mounted &&
      (!filterEpic || filterEpic === "") &&
      epics &&
      epics.length > 0
    ) {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;

      // prefer epic matching current year/month
      const found = epics.find(
        (e: any) =>
          e &&
          typeof e.epicYear === "number" &&
          typeof e.epicMonth === "number" &&
          e.epicYear === curYear &&
          e.epicMonth === curMonth,
      );
      const defaultEpic = found ? found.id : (epics[0] && epics[0].id) || "";
      if (defaultEpic) setFilterEpic(defaultEpic);

      // derive default sprint for this epic
      const sprints = getSprintsByEpic ? getSprintsByEpic(defaultEpic) : [];
      if (sprints && sprints.length) {
        // prefer sprint that contains today
        const containing = sprints.find((sp: any) => {
          const start = sp && (sp.start || sp.dateExpectedToStart || null);
          const end = sp && (sp.end || sp.dateExpectedToEnd || null);
          if (!start || !end) return false;
          try {
            const s = Date.parse(start);
            const e = Date.parse(end);
            const t = Date.now();
            return s <= t && t <= e;
          } catch (e) {
            return false;
          }
        });
        setFilterSprint((containing && containing.id) || sprints[0].id);
      }
    }
  }, [mounted, epics, getSprintsByEpic]);

  // when epic changes, reset/derive sprint for that epic
  useEffect(() => {
    if (!filterEpic) {
      setFilterSprint("");
      return;
    }
    const sprints = getSprintsByEpic ? getSprintsByEpic(filterEpic) : [];
    if (sprints && sprints.length) {
      const now = Date.now();
      const containing = sprints.find((sp: any) => {
        const start = sp && (sp.start || sp.dateExpectedToStart || null);
        const end = sp && (sp.end || sp.dateExpectedToEnd || null);
        if (!start || !end) return false;
        try {
          const s = Date.parse(start);
          const e = Date.parse(end);
          return s <= now && now <= e;
        } catch (e) {
          return false;
        }
      });
      setFilterSprint((containing && containing.id) || sprints[0].id);
    } else {
      setFilterSprint("");
    }
  }, [filterEpic, getSprintsByEpic]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar sprints={epics as Epic[]} />

      <main className="flex-1 h-screen overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-4 pb-3 border-b border-border flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">All Tasks</h1>
            </div>

            <div className="flex items-center gap-2">
              <input
                aria-label="Search tasks"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="text-sm w-24 sm:w-40 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground px-2 py-1"
              />

              <select
                aria-label="Filter by epic"
                value={filterEpic}
                onChange={(e) => setFilterEpic(e.target.value)}
                className="text-sm w-28 sm:w-auto rounded-md border border-border bg-background text-foreground px-2 py-1"
              >
                <option value="">All epics</option>
                {(epics || []).map((ep) => (
                  <option key={ep?.id} value={ep?.id}>
                    {ep?.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by sprint"
                value={filterSprint}
                onChange={(e) => setFilterSprint(e.target.value)}
                className="text-sm w-28 rounded-md border border-border bg-background text-foreground px-2 py-1"
              >
                <option value="">All sprints</option>
                {(filterEpic ? getSprintsByEpic(filterEpic) || [] : []).map(
                  (sp: any) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {inProgressTasks.length > 0 && (
              <section>
                <div className="mb-2 sm:mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">In Progress</h2>
                  <span className="ml-4 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                    {inProgressTasks.length}
                  </span>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  {inProgressTasks.map((t) => (
                    <SemiMiniTaskCard key={t.id} taskId={t.id} compact />
                  ))}
                </div>
              </section>
            )}

            {todoTasks.length > 0 && (
              <section>
                <div className="mb-2 sm:mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Todo</h2>
                  <span className="ml-4 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                    {todoTasks.length}
                  </span>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  {todoTasks.map((t) => (
                    <SemiMiniTaskCard key={t.id} taskId={t.id} compact />
                  ))}
                </div>
              </section>
            )}

            {completedTasks.length > 0 && (
              <section>
                <div className="mb-2 sm:mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Completed</h2>
                  <span className="ml-4 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                    {completedTasks.length}
                  </span>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  {completedTasks.map((t) => (
                    <SemiMiniTaskCard key={t.id} taskId={t.id} compact />
                  ))}
                </div>
              </section>
            )}

            {inProgressTasks.length === 0 &&
              todoTasks.length === 0 &&
              completedTasks.length === 0 && (
                <div className="text-center text-sm text-muted-foreground">
                  No tasks in store.
                </div>
              )}
          </div>
        </div>
      </main>
    </div>
  );
}
