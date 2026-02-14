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
  const epics = useRootEpicStore(
    useShallow((s) => s.epics.allIds.map((id) => s.epics.byId[id])),
  );
  const tasks = useRootEpicStore(
    useShallow((s) => s.tasks.allIds.map((id) => s.tasks.byId[id])),
  );
  const getSessionsByTask = useRootEpicStore(
    useShallow((s) => s.getSessionsByTask),
  );
  const storeVersion = useRootEpicStore((s) => s._version);

  const { inProgressTasks, todoTasks, completedTasks } = React.useMemo(() => {
    const inProgress: typeof tasks = [];
    const todo: typeof tasks = [];
    const done: typeof tasks = [];

    const q = (query || "").trim().toLowerCase();

    const filtered = (tasks || []).filter((t) => {
      if (!t) return false;
      if (filterEpic && (t as any).epicId !== filterEpic) return false;
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
  }, [tasks, getSessionsByTask, query, filterEpic, storeVersion]);

  // ensure stable client rendering when store initially empty
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex bg-slate-100">
      <Sidebar sprints={epics as Epic[]} />

      <main className="flex-1 h-screen overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-4 pb-3 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-slate-900 truncate">
                All Tasks
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <input
                aria-label="Search tasks"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="text-sm w-24 sm:w-40 rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700 placeholder:text-slate-400"
              />

              <select
                aria-label="Filter by epic"
                value={filterEpic}
                onChange={(e) => setFilterEpic(e.target.value)}
                className="text-sm w-28 sm:w-auto rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700"
              >
                <option value="">All epics</option>
                {(epics || []).map((ep) => (
                  <option key={ep?.id} value={ep?.id}>
                    {ep?.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {inProgressTasks.length > 0 && (
              <section>
                <div className="mb-2 sm:mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">
                    In Progress
                  </h2>
                  <span className="ml-4 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800">
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
                  <h2 className="text-sm font-semibold text-slate-800">Todo</h2>
                  <span className="ml-4 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800">
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
                  <h2 className="text-sm font-semibold text-slate-800">
                    Completed
                  </h2>
                  <span className="ml-4 inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800">
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
                <div className="text-center text-sm text-slate-500">
                  No tasks in store.
                </div>
              )}
          </div>
        </div>
      </main>
    </div>
  );
}
