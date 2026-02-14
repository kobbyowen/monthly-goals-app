"use client";

import React, { useMemo, useState } from "react";
import { useRootEpicStore } from "../stores";
import { useShallow } from "zustand/shallow";
import {
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
} from "@api/tasks";
import { createChecklistForTask as apiCreateChecklistForTask } from "@api/checklists";
import { toast, confirmDialog } from "../lib/ui";
import TaskDetails from "./TaskDetails";
import CheckList from "./CheckList";
import AddChecklistItem from "./AddChecklistItem";
import SessionsList from "./SessionsList";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

export default function TaskModal({
  taskId,
  onClose,
  onUpdated,
  onDeleted,
}: {
  taskId: string;
  onClose: () => void;
  onUpdated?: () => void;
  onDeleted?: () => void;
}) {
  const [task, sessions, checklists, storeUpdateTask, storeRemoveTask] =
    useRootEpicStore(
      useShallow((s) => [
        s.tasks.byId[taskId],
        s.getSessionsByTask(taskId),
        s.getChecklistsByTask(taskId),
        s.updateTask,
        s.removeTask,
      ]),
    );

  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  // action handlers (API -> store)
  async function handleRenameTask(newTitle: string) {
    try {
      const safe = (newTitle || "").slice(0, 128);
      const updated = await apiUpdateTask(taskId, { name: safe } as any);
      storeUpdateTask(updated.id, updated);
      if (onUpdated) onUpdated();
    } catch (err) {
      toast("task failed", "error");
    }
  }

  async function handleDeleteTask() {
    try {
      await apiDeleteTask(taskId);
      storeRemoveTask(taskId);
      if (onDeleted) onDeleted();
      onClose();
    } catch (err) {
      toast("task failed", "error");
    }
  }

  if (!task) return null;

  const isRunning = !!sessions?.find((s) => !s.endedAt);
  const completed = !!task.completed;

  const status = completed ? "completed" : isRunning ? "running" : "todo";

  const totalSeconds = useMemo(() => {
    if (!sessions?.length) return 0;

    let total = sessions.reduce((acc, s) => acc + (s.seconds ?? 0), 0);

    const running = sessions.find((s) => !s.endedAt);
    if (running) {
      const started = new Date(running.startedAt).getTime();
      total += Math.floor((Date.now() - started) / 1000);
    }

    return total;
  }, [sessions]);

  const checklistCompleted = checklists?.filter((c) => c.done).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Task Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto px-5 py-5 space-y-6">
          {/* Task Details */}
          <TaskDetails
            name={task.name}
            status={status}
            totalSeconds={totalSeconds}
            estimatedSeconds={task.plannedTime as number}
            checklistTotal={checklists.length}
            checklistCompleted={checklistCompleted}
            onRename={handleRenameTask}
          />

          {/* Checklist Section */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Checklist
              </h3>

              <button
                onClick={() => setShowAddItem(true)}
                disabled={showAddItem || completed}
                className={`text-xs font-medium text-emerald-600 hover:underline ${showAddItem || completed ? "opacity-50 cursor-default" : ""}`}
              >
                + Add Item
              </button>
            </div>

            {showAddItem && !completed && (
              <div className="mb-3">
                <AddChecklistItem
                  taskId={taskId}
                  onAdded={() => setShowAddItem(false)}
                />
              </div>
            )}

            <CheckList taskId={taskId} hideEmptyWhenAdding={showAddItem} />
          </div>

          {/* Sessions Section */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sessions
              </h3>

              <button
                onClick={() => setSessionsOpen((v) => !v)}
                className="text-slate-400 hover:text-slate-600"
              >
                {sessionsOpen ? (
                  <FiChevronUp size={16} />
                ) : (
                  <FiChevronDown size={16} />
                )}
              </button>
            </div>

            {sessionsOpen && <SessionsList sessions={sessions} />}
          </div>

          {/* Danger Zone */}
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
            <p className="text-xs text-rose-700">
              Deleting this task will permanently remove all sessions and
              checklist items.
            </p>
            <button
              onClick={async () => {
                const ok = await confirmDialog(
                  "Are you sure you want to delete this task? This will permanently remove all sessions and checklist items.",
                );
                if (!ok) return;
                handleDeleteTask();
              }}
              className="mt-2 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Delete Task
            </button>
          </div>
        </div>

        {/* Footer removed — actions save live */}
      </div>
    </div>
  );
}
