"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@lib/api";
import MiniTaskCard from "@components/MiniTaskCard";
import Card from "@components/Card";
import Timeline from "@components/Timeline";
import computeEpicMetrics from "@lib/epicMetrics";
import type {
  Epic as ApiEpic,
  Task as ApiTask,
  Session as ApiSession,
} from "@lib/api/types";

function formatSeconds(total: number) {
  const sec = Math.floor(total % 60);
  const min = Math.floor((total / 60) % 60);
  const hrs = Math.floor(total / 3600);
  return [hrs, min, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

function totalDurationForTask(t: ApiTask): number {
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

export default function Dashboard({ epics }: { epics: ApiEpic[] }) {
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

  const metrics = useMemo(
    () => computeEpicMetrics(selectedEpic),
    [selectedEpic],
  );

  // Aggregate tasks from the epic itself and any child sprints
  const tasks = ((selectedEpic?.tasks || []) as ApiTask[]).concat(
    ...(selectedEpic?.sprints?.map((sp) => (sp.tasks || []) as ApiTask[]) ||
      []),
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

    const allSessions: { task: ApiTask; session: ApiSession }[] = [];
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
        label: task.name || task.title || "Task",
        colorClass,
      });
    });

    return entries;
  }, [tasks]);

  const hasEpics = epics.length > 0;

  if (!hasEpics) {
    return (
      <div className="mx-auto max-w-3xl py-10 px-3 sm:py-16">
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-500">
            Analytics
          </p>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            No monthly epics yet
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a monthly epic to start tracking time, sessions, and
            progress.
          </p>
          <button
            onClick={() => router.push(withBase("/epics"))}
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
        <h1 className="text-xl font-bold text-foreground">
          Time Management Dashboard
        </h1>
        <div className="w-full sm:w-56">
          <div className="relative">
            <select
              value={selectedEpicId || ""}
              onChange={(e) => setSelectedEpicId(e.target.value || null)}
              className="w-full appearance-none rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
            >
              {epics.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>

            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-muted-foreground">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 9l6 6 6-6"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* MONTHLY STATS */}
      <section>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="border-border">
            <p className="text-xs text-muted-foreground">Estimated Effort</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {(() => {
                const secs = Number(metrics.totalPlanned ?? 0);
                return `${Math.round(secs / 3600)}h`;
              })()}
            </p>
          </Card>

          <Card className="border-yellow-300">
            <p className="text-xs text-muted-foreground">Effort Used</p>
            <p className="mt-1 text-2xl font-bold text-yellow-600">
              {(() => {
                const secs = Number(metrics.totalUsed ?? 0);
                return `${Math.round(secs / 3600)}h`;
              })()}
            </p>
          </Card>

          <Card className="border-emerald-300">
            <p className="text-xs text-muted-foreground">Checklist</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {(() => {
                const total = Number(metrics.checklistTotal ?? 0);
                const done = Number(metrics.checklistCompleted ?? 0);
                return `${done} / ${total}`;
              })()}
            </p>
          </Card>

          <Card className="border-border">
            <p className="text-xs text-muted-foreground">Completion</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {metrics.completionPercent + "%"}
            </p>
          </Card>
        </div>
      </section>

      {/* ANALYTICS SUMMARY */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Monthly Epic Summary
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-300 bg-card text-card-foreground p-4 shadow-sm transition-shadow hover:shadow-md">
            <span className="text-xs text-muted-foreground">
              Tasks Completed
            </span>
            <div className="mt-2 text-3xl font-bold text-emerald-600">
              {completedTasks.length}
            </div>
          </div>

          <div className="rounded-xl border border-yellow-300 bg-card text-card-foreground p-4 shadow-sm transition-shadow hover:shadow-md">
            <span className="text-xs text-muted-foreground">In Progress</span>
            <div className="mt-2 text-3xl font-bold text-yellow-500">
              {inProgressTasks.length}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card text-card-foreground p-4 shadow-sm transition-shadow hover:shadow-md">
            <span className="text-xs text-muted-foreground">Not Started</span>
            <div className="mt-2 text-3xl font-bold text-foreground">
              {notStartedTasks.length}
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVE TASKS */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Active Tasks
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Not Started */}
          <div className="min-w-60 rounded-xl border border-border bg-card text-card-foreground p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-card-foreground">
                To DO
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">
                {notStartedTasks.length} tasks
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {notStartedTasks.map((t) => {
                const used = totalDurationForTask(t) || 0;
                const planned =
                  (typeof t.plannedTime === "number" && t.plannedTime > 0
                    ? t.plannedTime
                    : typeof t.timeActuallySpent === "number" &&
                        t.timeActuallySpent > 0
                      ? t.timeActuallySpent
                      : typeof t.timeSpent === "number" && t.timeSpent > 0
                        ? t.timeSpent
                        : 0) || 0;
                return (
                  <MiniTaskCard
                    key={t.id}
                    name={t.name || t.title || ""}
                    badge="Pending"
                    usedSec={used}
                    plannedSec={planned}
                    running={Boolean(
                      (t.sessions || []).some((s) => s.startedAt && !s.endedAt),
                    )}
                    leftText="Start"
                    rightText="End"
                    onLeft={() =>
                      selectedEpicId &&
                      router.push(withBase(`/epics/${selectedEpicId}`))
                    }
                    leftClass="bg-emerald-600"
                    rightDisabled
                  />
                );
              })}
              {!notStartedTasks.length && (
                <p className="text-xs text-muted-foreground">
                  No tasks waiting to start.
                </p>
              )}
            </div>
          </div>

          {/* In Progress */}
          <div className="min-w-60 rounded-xl border border-yellow-300 bg-card text-card-foreground p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-card-foreground">
                In Progress
              </h3>
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] text-yellow-700">
                {inProgressTasks.length} tasks
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {inProgressTasks.map((t) => {
                const used = totalDurationForTask(t) || 0;
                const planned =
                  (typeof t.plannedTime === "number" && t.plannedTime > 0
                    ? t.plannedTime
                    : typeof t.timeActuallySpent === "number" &&
                        t.timeActuallySpent > 0
                      ? t.timeActuallySpent
                      : typeof t.timeSpent === "number" && t.timeSpent > 0
                        ? t.timeSpent
                        : 0) || 0;
                return (
                  <MiniTaskCard
                    key={t.id}
                    name={t.name || t.title || ""}
                    badge="Started"
                    usedSec={used}
                    plannedSec={planned}
                    running={Boolean(
                      (t.sessions || []).some((s) => s.startedAt && !s.endedAt),
                    )}
                    leftText="Resume"
                    rightText="End"
                    onLeft={() =>
                      selectedEpicId &&
                      router.push(withBase(`/epics/${selectedEpicId}`))
                    }
                    onRight={() =>
                      selectedEpicId &&
                      router.push(withBase(`/epics/${selectedEpicId}`))
                    }
                    leftClass="bg-slate-100 text-slate-700"
                    rightClass="bg-rose-600"
                  />
                );
              })}
              {!inProgressTasks.length && (
                <p className="text-xs text-muted-foreground">
                  No tasks currently in progress.
                </p>
              )}
            </div>
          </div>

          {/* Completed */}
          <div className="min-w-60 rounded-xl border border-emerald-300 bg-card text-card-foreground p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-card-foreground">
                Completed
              </h3>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                {completedTasks.length} tasks
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {completedTasks.map((t) => {
                const used = totalDurationForTask(t) || 0;
                const planned =
                  (typeof t.plannedTime === "number" && t.plannedTime > 0
                    ? t.plannedTime
                    : typeof t.timeActuallySpent === "number" &&
                        t.timeActuallySpent > 0
                      ? t.timeActuallySpent
                      : typeof t.timeSpent === "number" && t.timeSpent > 0
                        ? t.timeSpent
                        : 0) || 0;
                return (
                  <MiniTaskCard
                    key={t.id}
                    name={t.name || t.title || ""}
                    badge="Completed"
                    usedSec={used}
                    plannedSec={planned}
                    running={Boolean(
                      (t.sessions || []).some((s) => s.startedAt && !s.endedAt),
                    )}
                    leftText=""
                    rightText="Done"
                    rightDisabled
                    rightClass="bg-slate-100 text-slate-400"
                  />
                );
              })}
              {!completedTasks.length && (
                <p className="text-xs text-muted-foreground">
                  No completed tasks yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Monthly Epic Timeline
        </h2>

        <Timeline items={timelineItems} />

        <p className="mt-2 text-xs text-muted-foreground">
          Timeline highlights how work is distributed across this monthly epic.
        </p>
      </section>
    </div>
  );
}
