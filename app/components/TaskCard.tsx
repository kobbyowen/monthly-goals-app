"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRootEpicStore } from "../stores";
import { useShallow } from "zustand/shallow";
import { FiPlay, FiCheck, FiPause, FiRotateCcw } from "react-icons/fi";
import { toast } from "../lib/ui";
import TaskModal from "./TaskDetailsModal";
import {
  createSession,
  updateSession as apiUpdateSession,
} from "@api/sessions";
import { updateTask as apiUpdateTask } from "@api/tasks";

type Status = "todo" | "running" | "completed";

/* ---------------- Utils ---------------- */

function formatHMS(totalSeconds: number) {
  const sec = totalSeconds % 60;
  const min = Math.floor((totalSeconds / 60) % 60);
  const hrs = Math.floor(totalSeconds / 3600);
  return [hrs, min, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

function formatEstimate(seconds?: number) {
  if (!seconds || seconds <= 0) return "—";
  const minsTotal = Math.round(seconds / 60);
  const hrs = Math.floor(minsTotal / 60);
  const mins = minsTotal % 60;
  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins}m`;
}

/* ---------------- Button ---------------- */

function ActionButton({
  children,
  color,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  color: string;
  onClick?: React.MouseEventHandler;
  ariaLabel: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      aria-label={ariaLabel}
      className={`p-2 rounded-lg text-white active:scale-95 transition ${color}`}
    >
      {children}
    </button>
  );
}

/* ---------------- Component ---------------- */

export default function TaskCard({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [task, sessions, checklists] = useRootEpicStore(
    useShallow((s) => [
      s.tasks.byId[taskId],
      s.getSessionsByTask(taskId),
      s.getChecklistsByTask(taskId),
    ]),
  );

  console.log({ task });

  const name = task?.name ?? "Untitled";
  const completed = !!task?.completed;
  const plannedTimeSeconds = task?.plannedTime;

  /* ---------- Status ---------- */

  const isRunning = !!sessions?.find((s) => !s.endedAt);

  const status: Status = completed
    ? "completed"
    : isRunning
      ? "running"
      : "todo";

  /* ---------- Elapsed ---------- */

  const baseElapsed = useMemo(() => {
    if (!sessions?.length) return 0;

    let total = sessions.reduce((acc, s) => acc + (s.seconds ?? 0), 0);

    const running = sessions.find((s) => !s.endedAt);
    if (running) {
      const started = new Date(running.startedAt).getTime();
      total += Math.floor((Date.now() - started) / 1000);
    }

    return total;
  }, [sessions]);

  const [elapsed, setElapsed] = useState(baseElapsed);

  useEffect(() => {
    setElapsed(baseElapsed);
  }, [baseElapsed]);

  useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  /* ---------- Checklist ---------- */

  const checklistTotal = checklists?.length ?? 0;
  const checklistCompleted = checklists?.filter((c) => c.done).length ?? 0;

  /* ---------- Styles by Status ---------- */

  const styles = {
    todo: {
      border: "border-gray-200",
      dot: "bg-gray-400",
      timer: "text-gray-400",
    },
    running: {
      border: "border-yellow-200",
      dot: "bg-yellow-500",
      timer: "text-yellow-600",
    },
    completed: {
      border: "border-green-200 opacity-90",
      dot: "bg-green-500",
      timer: "text-green-600",
    },
  }[status];

  /* ---------- Actions ---------- */

  function renderActions() {
    switch (status) {
      case "todo":
        return (
          <>
            <ActionButton
              color="bg-indigo-600 hover:bg-indigo-700"
              ariaLabel="start"
              onClick={handleStart}
            >
              <FiPlay size={16} />
            </ActionButton>

            <ActionButton
              color="bg-green-600 hover:bg-green-700"
              ariaLabel="complete"
              onClick={handleComplete}
            >
              <FiCheck size={16} />
            </ActionButton>
          </>
        );

      case "running":
        return (
          <>
            <ActionButton
              color="bg-yellow-500 hover:bg-yellow-600"
              ariaLabel="pause"
              onClick={handlePause}
            >
              <FiPause size={16} />
            </ActionButton>

            <ActionButton
              color="bg-green-600 hover:bg-green-700"
              ariaLabel="complete"
              onClick={handleComplete}
            >
              <FiCheck size={16} />
            </ActionButton>
          </>
        );

      case "completed":
        return (
          <ActionButton
            color="bg-gray-700 hover:bg-gray-800"
            ariaLabel="reopen"
            onClick={handleReopen}
          >
            <FiRotateCcw size={16} />
          </ActionButton>
        );
    }
  }

  /* ---------- API / Store wiring ---------- */

  const [addSessionToStore, storeUpdateSession, storeUpdateTask] =
    useRootEpicStore(
      useShallow((s) => [s.addSession, s.updateSession, s.updateTask]),
    );

  async function handleStart(e?: React.MouseEvent) {
    e?.stopPropagation();
    try {
      const created = await createSession({
        taskId,
        startedAt: new Date().toISOString(),
      });
      addSessionToStore(created);
      const existing = task?.sessionIds ?? [];
      storeUpdateTask(taskId, {
        sessionIds: Array.from(new Set([...existing, created.id])),
      });
    } catch (err) {
      toast("session failed", "error");
    }
  }

  async function handlePause(e?: React.MouseEvent) {
    e?.stopPropagation();
    const running = sessions?.find((s) => !s.endedAt);
    if (!running) return;
    try {
      const updated = await apiUpdateSession(running.id, {
        endedAt: new Date().toISOString(),
      });
      storeUpdateSession(updated.id, updated);
    } catch (err) {
      toast("session failed", "error");
    }
  }

  async function handleComplete(e?: React.MouseEvent) {
    e?.stopPropagation();
    try {
      const updated = await apiUpdateTask(taskId, { completed: true });
      storeUpdateTask(updated.id, updated);
    } catch (err) {
      toast("task failed", "error");
    }
  }

  async function handleReopen(e?: React.MouseEvent) {
    e?.stopPropagation();
    try {
      const updated = await apiUpdateTask(taskId, { completed: false });
      storeUpdateTask(updated.id, updated);
    } catch (err) {
      toast("task failed", "error");
    }
  }

  /* ---------- Render ---------- */

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className={`bg-white rounded-2xl border ${styles.border} p-4 shadow-sm cursor-pointer`}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left */}
          <div className="flex items-start gap-3 flex-1">
            <span className={`mt-1 w-2.5 h-2.5 rounded-full ${styles.dot}`} />

            <div className="flex-1">
              <p
                className={`${status === "completed" ? "text-gray-700" : "text-gray-900"} text-sm font-semibold`}
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  wordBreak: "break-all",
                  overflowWrap: "anywhere",
                }}
              >
                {name}
              </p>

              <p className="text-xs text-gray-400 mt-1">
                {status === "completed"
                  ? `Completed • ${formatHMS(elapsed)}`
                  : `${checklistCompleted}/${checklistTotal} checklist • ${formatEstimate(
                      plannedTimeSeconds as number,
                    )}`}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <span className={`text-xs font-semibold ${styles.timer}`}>
              {formatHMS(elapsed)}
            </span>

            <div className="flex items-center gap-2">{renderActions()}</div>
          </div>
        </div>
      </div>

      {open && <TaskModal taskId={taskId} onClose={() => setOpen(false)} />}
    </>
  );
}
