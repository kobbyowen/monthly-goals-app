"use client";

import React, { useMemo, useState } from "react";
import useRootEpicStore from "@stores/rootEpicStore";
import { request, getTask, updateTask, updateSession } from "@lib/api/index";
import { toast } from "../lib/ui";
import TaskModal from "./TaskDetailsModal";
import { useShallow } from "zustand/shallow";

type Props = {
  taskId: string;
  compact?: boolean;
  onUpdated?: () => void;
};

function IconPause() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="6" y="5" width="3" height="14" fill="currentColor" />
      <rect x="15" y="5" width="3" height="14" fill="currentColor" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M5 3v18l15-9L5 3z" fill="currentColor" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.293 16.293a1 1 0 011.414 0L18.707 8.293a1 1 0 011.414 1.414l-9 9a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9.293 16.293z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function SemiMiniTaskCard({
  taskId,
  compact,
  onUpdated,
}: Props) {
  const {
    task,
    sessions,
    checklists,
    epic,
    sprint,
    addSession: addSessionInStore,
    updateSession: updateSessionInStore,
    updateTask: updateTaskInStore,
  } = useRootEpicStore(
    useShallow((s) => ({
      task: s.tasks.byId[taskId],
      sessions: s.getSessionsByTask(taskId),
      checklists: s.getChecklistsByTask(taskId),
      epic: (() => {
        const t = s.tasks.byId[taskId];
        const eid = t?.epicId;
        return typeof eid === "string" ? s.epics.byId[eid] : undefined;
      })(),
      sprint: (() => {
        const t = s.tasks.byId[taskId];
        const sid = t?.sprintId;
        return typeof sid === "string" ? s.sprints.byId[sid] : undefined;
      })(),
      addSession: s.addSession,
      updateSession: s.updateSession,
      updateTask: s.updateTask,
    })),
  );

  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(false);

  const meta = useMemo(() => {
    const sessArr = Array.isArray(sessions) ? sessions : [];
    const now = Date.now();
    const base = sessArr.reduce(
      (acc, s) => acc + (s.seconds ?? (s as any).duration ?? 0),
      0,
    );
    const open = sessArr.find((s) => s.startedAt && !s.endedAt);
    const used = open
      ? base +
        Math.max(
          0,
          Math.floor((now - new Date(open.startedAt).getTime()) / 1000),
        )
      : base;
    const est =
      ((task && (task.plannedTime ?? (task as any).estimate)) as number) ?? 0;
    const checklistTotal = Array.isArray(checklists) ? checklists.length : 0;
    const checklistDone = Array.isArray(checklists)
      ? checklists.filter((c) => (c as any).completed ?? (c as any).done).length
      : 0;
    const completed = !!task?.completed;
    const inProgress = !completed && (!!open || used > 0);
    const status = completed ? "completed" : inProgress ? "inprogress" : "todo";
    return { used, est, checklistTotal, checklistDone, open, status };
  }, [task, sessions, checklists]);

  if (!task) return null;

  async function startTask() {
    setLoading(true);
    try {
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await request({
        path: `/tasks/${encodeURIComponent(taskId)}/sessions`,
        method: "POST",
        body: { id: sessionId, startedAt: new Date().toISOString() },
      });
      // optimistic: add session to store
      addSessionInStore({
        id: sessionId,
        taskId,
        startedAt: new Date().toISOString(),
      } as any);
      // ensure store version/task state updates so grouping moves task to In Progress
      try {
        updateTaskInStore(taskId, {} as any);
      } catch (e) {
        // ignore
      }
      onUpdated?.();
    } catch (err) {
      console.error(err);
      toast("Could not start task", "error");
    } finally {
      setLoading(false);
    }
  }

  async function stopTask() {
    setLoading(true);
    try {
      const remote = await getTask(taskId);
      const sessArr = Array.isArray(remote.sessions) ? remote.sessions : [];
      const open = sessArr.find((s) => s.startedAt && !s.endedAt);
      if (open) {
        const now = Date.now();
        const started = new Date(open.startedAt).getTime();
        const duration = Math.max(0, Math.floor((now - started) / 1000));
        await updateSession(open.id, {
          endedAt: new Date().toISOString(),
          duration,
        });
        // update store session
        updateSessionInStore(open.id, {
          endedAt: new Date().toISOString(),
          duration,
        } as any);
      }
      // refresh task-level fields
      const updated = await getTask(taskId);
      if (updated.sessions && updated.sessions.length) {
        updated.sessions.forEach((s: any) => addSessionInStore(s));
      }
      updateTaskInStore(taskId, {
        endedAt: updated.endedAt,
        completed: updated.completed,
      } as any);
      onUpdated?.();
    } catch (err) {
      console.error(err);
      toast("Could not stop task", "error");
    } finally {
      setLoading(false);
    }
  }

  async function completeTask() {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      await updateTask(taskId, { completed: true, endedAt: now });
      updateTaskInStore(taskId, { completed: true, endedAt: now } as any);
      onUpdated?.();
    } catch (err) {
      console.error(err);
      toast("Could not complete task", "error");
    } finally {
      setLoading(false);
    }
  }

  const borderClass =
    meta.status === "completed"
      ? "border-l-yellow-400"
      : meta.status === "inprogress"
        ? "border-l-emerald-400"
        : "border-l-slate-300";

  return (
    <div
      onClick={() => setShowModal(true)}
      role="button"
      tabIndex={0}
      className={`rounded-lg border border-slate-200 ${borderClass} border-l-4 bg-white px-4 ${compact ? "py-2" : "py-2"} cursor-pointer`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">
            {(task as any).name || (task as any).title}
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {epic?.name || (task as any).epicName || ""}
            {sprint || task.sprintId
              ? ` · ${sprint?.sprintLabel || sprint?.name || (task as any).sprintName || ""}`
              : ""}
          </p>
          <div className="mt-1 flex items-center gap-4 text-[11px] text-slate-500">
            <span>
              {Math.floor(meta.used / 60)}m /{" "}
              {Math.round((meta.est ?? 0) / 3600)}h
            </span>
            <span className="font-medium text-emerald-600">
              ✓ {meta.checklistDone} / {meta.checklistTotal}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {meta.status === "completed" ? null : (
            <>
              {meta.open ? (
                <button
                  disabled={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    void stopTask();
                  }}
                  className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
                  aria-label="Pause"
                >
                  <IconPause />
                </button>
              ) : (
                <button
                  disabled={loading}
                  onClick={(e) => {
                    e.stopPropagation();
                    void startTask();
                  }}
                  className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
                  aria-label="Start"
                >
                  <IconPlay />
                </button>
              )}

              <button
                disabled={loading}
                onClick={(e) => {
                  e.stopPropagation();
                  void completeTask();
                }}
                className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"
                aria-label="Complete"
              >
                <IconCheck />
              </button>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <TaskModal
          taskId={taskId}
          onClose={() => setShowModal(false)}
          onUpdated={() => {
            onUpdated?.();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
