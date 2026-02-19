"use client";
import React, { useEffect, useState } from "react";
import { createTodo as apiCreateTodo } from "@lib/api/todos";
import useRootEpicStore from "@stores/rootEpicStore";
import type { Task } from "@stores/types";

export default function AddNewTodoModal({ onClose }: { onClose: () => void }) {
  const taskIds = useRootEpicStore((s) => s.tasks.allIds);
  const tasksById = useRootEpicStore((s) => s.tasks.byId);
  const sprintIds = useRootEpicStore((s) => s.sprints.allIds);
  const sprintsById = useRootEpicStore((s) => s.sprints.byId);

  // compute current sprint (based on today's date) and only surface tasks for it
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentSprint = React.useMemo(() => {
    const sprints = (sprintIds || [])
      .map((id) => sprintsById[id])
      .filter(Boolean);
    return sprints.find((sp: any) => {
      if (!sp) return false;
      // sprint model uses `start`/`end` in the store, accept legacy names too
      const start = sp.start || sp.startDate || sp.startAt || null;
      const end = sp.end || sp.endDate || sp.endAt || null;
      if (!start || !end) return false;
      return start <= todayIso && todayIso <= end;
    }) as any | undefined;
  }, [sprintIds, sprintsById, todayIso]);

  const tasks = React.useMemo(() => {
    const all = (taskIds || [])
      .map((id) => tasksById[id])
      .filter(Boolean) as any[];
    if (!currentSprint) return all;
    return all.filter((t) => t && t.sprintId === currentSprint.id);
  }, [taskIds, tasksById, currentSprint]);
  const addTodoStore = useRootEpicStore((s) => s.addTodo);

  const [selectedTaskId, setSelectedTaskId] = useState<string | "">("");
  const [title, setTitle] = useState("");
  const [plannedHours, setPlannedHours] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedTaskId) return;
    const t = tasks.find((x) => x.id === selectedTaskId);
    if (t) setTitle((t as any).title || t.name || "");
  }, [selectedTaskId, tasks]);

  async function handleCreate() {
    if (!selectedTaskId) return;
    const task = tasks.find((t) => t.id === selectedTaskId) as Task | undefined;
    if (!task) return;
    setLoading(true);
    try {
      const dueDate = new Date().toISOString().slice(0, 10);
      const payload: any = {
        sprintId: task.sprintId,
        taskId: task.id,
        title: title || (task as any).title || task.name,
        dueDate,
        plannedHours: typeof plannedHours === "number" ? plannedHours : 0,
      };
      const created = await apiCreateTodo(payload);
      addTodoStore(created);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card text-card-foreground">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Add New Todo</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-card-foreground"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Linked Task
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Select a task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {(t as any).title || t.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Todo will be associated with this sprint task.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-card text-card-foreground"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Planned Effort (hours)
            </label>
            <input
              type="number"
              min="0"
              step="0.25"
              placeholder="e.g. 2"
              value={plannedHours as any}
              onChange={(e) =>
                setPlannedHours(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-card text-card-foreground"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            {/* Context: epic & sprint display could be added here */}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md bg-muted px-4 py-2 text-sm font-semibold text-foreground hover:opacity-90"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !selectedTaskId}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Todo"}
          </button>
        </div>
      </div>
    </div>
  );
}
