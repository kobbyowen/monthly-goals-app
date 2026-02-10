"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  completed?: boolean;
  sessions?: Session[];
  timeSpent?: number;
  timeActuallySpent?: number;
};

type Epic = {
  id: string;
  name: string;
  tasks?: Task[];
  sprints?: { id: string; name: string; tasks?: Task[] }[];
};

function formatSeconds(total: number) {
  const sec = Math.floor(total % 60);
  const min = Math.floor((total / 60) % 60);
  const hrs = Math.floor(total / 3600);
  return [hrs, min, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

function totalDurationForTask(t: Task): number {
  const sessions = t.sessions || [];
  let base = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  if ((base || 0) === 0 && t.completed) {
    if (typeof t.timeActuallySpent === "number" && t.timeActuallySpent > 0) {
      base = t.timeActuallySpent;
    } else if (typeof t.timeSpent === "number" && t.timeSpent > 0) {
      base = t.timeSpent;
    }
  }
  return base;
}

export default function Dashboard({ epics }: { epics: Epic[] }) {
  const router = useRouter();
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);

  // Whenever the epics list changes (e.g., create/delete/rename), ensure we have a valid selection
  useEffect(() => {
    if (!epics || epics.length === 0) {
      setSelectedEpicId(null);
      return;
    }
    if (!selectedEpicId || !epics.some((e) => e.id === selectedEpicId)) {
      setSelectedEpicId(epics[0].id);
    }
  }, [epics, selectedEpicId]);

  const selectedEpic = useMemo(
    () => epics.find((e) => e.id === selectedEpicId) || null,
    [epics, selectedEpicId],
  );

  // Aggregate tasks from the epic itself and any child sprints
  const tasks = ((selectedEpic?.tasks || []) as Task[]).concat(
    ...(selectedEpic?.sprints?.map((sp) => (sp.tasks || []) as Task[]) || []),
  );

  const completedTasks = tasks.filter((t) => t.completed);
  const inProgressTasks = tasks.filter(
    (t) => !t.completed && (t.sessions || []).length > 0,
  );
  const notStartedTasks = tasks.filter(
    (t) => !t.completed && (t.sessions || []).length === 0,
  );

  const timelineItems = useMemo(() => {
    const entries: {
      timeLabel: string;
      width: string;
      label: string;
      colorClass: string;
    }[] = [];

    const allSessions: { task: Task; session: Session }[] = [];
    tasks.forEach((t) => {
      (t.sessions || []).forEach((s) => {
        if (s.startedAt) allSessions.push({ task: t, session: s });
      });
    });

    if (!allSessions.length) return entries;

    allSessions.sort((a, b) => {
      const ta = new Date(a.session.startedAt || 0).getTime();
      const tb = new Date(b.session.startedAt || 0).getTime();
      return ta - tb;
    });

    const maxDuration = Math.max(
      60,
      ...allSessions.map((p) => p.session.duration || 0 || 0),
    );

    allSessions.slice(0, 8).forEach(({ task, session }) => {
      const dur = session.duration || 0;
      const ratio = Math.max(0.15, Math.min(1, dur / maxDuration));
      const timeLabel = new Date(session.startedAt || 0).toLocaleTimeString(
        [],
        { hour: "2-digit", minute: "2-digit" },
      );

      const isCompleted = !!task.completed;
      const hasWork = (task.sessions || []).length > 0;

      const colorClass = isCompleted
        ? "bg-emerald-500"
        : hasWork
          ? "bg-yellow-400"
          : "bg-slate-500";

      entries.push({
        timeLabel,
        width: String(Math.round(ratio * 100)) + "%",
        label: task.name,
        colorClass,
      });
    });

    return entries;
  }, [tasks]);

  const hasEpics = epics.length > 0;

  if (!hasEpics) {
    return (
      <div className="mx-auto max-w-3xl py-10 px-3 sm:py-16">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Analytics
          </p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            No monthly epics yet
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create a monthly epic to start tracking time, sessions, and
            progress.
          </p>
          <button
            onClick={() => router.push("/epics")}
            className="mt-4 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            Go to Monthly Epics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full mx-auto max-w-6xl space-y-6 px-3 sm:px-4 md:px-0 sm:space-y-8 lg:space-y-10 pb-16">
      {/* HEADER + EPIC SELECTOR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          Time Management Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Monthly Epic</span>
          <select
            value={selectedEpicId || ""}
            onChange={(e) => setSelectedEpicId(e.target.value || null)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {epics.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ANALYTICS SUMMARY */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Monthly Epic Summary
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-300 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <span className="text-xs text-slate-600">Tasks Completed</span>
            <div className="mt-2 text-3xl font-bold text-emerald-600">
              {completedTasks.length}
            </div>
          </div>

          <div className="rounded-xl border border-yellow-300 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <span className="text-xs text-slate-600">In Progress</span>
            <div className="mt-2 text-3xl font-bold text-yellow-500">
              {inProgressTasks.length}
            </div>
          </div>

          <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            <span className="text-xs text-slate-600">Not Started</span>
            <div className="mt-2 text-3xl font-bold text-slate-700">
              {notStartedTasks.length}
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVE TASKS */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Active Tasks
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Not Started */}
          <div className="min-w-[240px] rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Not Started
              </h3>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">
                {notStartedTasks.length} tasks
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {notStartedTasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-900">
                      {t.name}
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">
                      Not Started
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() =>
                        selectedEpicId &&
                        router.push("/epics/" + selectedEpicId)
                      }
                      className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                    >
                      Start
                    </button>
                    <button
                      disabled
                      className="flex-1 rounded-lg bg-rose-100 py-1.5 text-[11px] font-semibold text-rose-300 cursor-not-allowed"
                    >
                      End
                    </button>
                  </div>
                </div>
              ))}
              {!notStartedTasks.length && (
                <p className="text-xs text-slate-400">
                  No tasks waiting to start.
                </p>
              )}
            </div>
          </div>

          {/* In Progress */}
          <div className="min-w-[240px] rounded-xl border border-yellow-300 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                In Progress
              </h3>
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] text-yellow-700">
                {inProgressTasks.length} tasks
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {inProgressTasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-yellow-100 bg-yellow-50 p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-900">
                      {t.name}
                    </span>
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] text-yellow-700">
                      In Progress
                    </span>
                  </div>
                  <div className="mt-2 text-center font-mono text-sm font-bold">
                    {formatSeconds(totalDurationForTask(t))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() =>
                        selectedEpicId &&
                        router.push("/epics/" + selectedEpicId)
                      }
                      className="flex-1 rounded-lg bg-slate-100 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      Resume
                    </button>
                    <button
                      onClick={() =>
                        selectedEpicId &&
                        router.push("/epics/" + selectedEpicId)
                      }
                      className="flex-1 rounded-lg bg-rose-600 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700"
                    >
                      End
                    </button>
                  </div>
                </div>
              ))}
              {!inProgressTasks.length && (
                <p className="text-xs text-slate-400">
                  No tasks currently in progress.
                </p>
              )}
            </div>
          </div>

          {/* Completed */}
          <div className="min-w-[240px] rounded-xl border border-emerald-300 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Completed
              </h3>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                {completedTasks.length} tasks
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {completedTasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-emerald-100 bg-emerald-50 p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-900">
                      {t.name}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                      Completed
                    </span>
                  </div>
                  <div className="mt-2 text-center font-mono text-sm font-bold">
                    {formatSeconds(totalDurationForTask(t))}
                  </div>
                  <div className="mt-2">
                    <button className="w-full rounded-lg bg-slate-100 py-1.5 text-[11px] font-semibold text-slate-400 cursor-not-allowed">
                      Done
                    </button>
                  </div>
                </div>
              ))}
              {!completedTasks.length && (
                <p className="text-xs text-slate-400">
                  No completed tasks yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Monthly Epic Timeline
        </h2>

        <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
          <div className="space-y-3 min-w-[280px]">
            {timelineItems.length ? (
              timelineItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-14 text-xs text-slate-500">
                    {item.timeLabel}
                  </span>
                  <div className="flex-1 h-3 rounded bg-slate-200">
                    <div
                      className={"h-3 rounded " + item.colorClass}
                      style={{ width: item.width }}
                    />
                  </div>
                  <span className="text-xs truncate">{item.label}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">
                No sessions recorded yet for this monthly epic.
              </p>
            )}
          </div>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Timeline highlights how work is distributed across this monthly epic.
        </p>
      </section>

      {/* Floating logout button at bottom of dashboard */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        <button
          type="button"
          onClick={async () => {
            try {
              await fetch(withBase("/api/auth/logout"), { method: "POST" });
            } catch (e) {}
            router.push("/auth/login");
            router.refresh();
          }}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-md ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
