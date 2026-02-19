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
  const epicIds = useRootEpicStore((s) => s.epics.allIds);
  const epicsById = useRootEpicStore((s) => s.epics.byId);
  const getSprintsByEpic = useRootEpicStore((s) => s.getSprintsByEpic);
  const getTasksBySprint = useRootEpicStore((s) => s.getTasksBySprint);

  // compute current sprint (based on today's date) and current epic
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

  const currentEpic = React.useMemo(() => {
    const epics = (epicIds || []).map((id) => epicsById[id]).filter(Boolean) as any[];
    // prefer epics that contain a sprint that includes today
    for (const e of epics) {
      const sps = getSprintsByEpic(e.id) || [];
      if (sps.find((sp: any) => {
        const start = sp.start || sp.startDate || sp.startAt || null;
        const end = sp.end || sp.endDate || sp.endAt || null;
        return start && end && start <= todayIso && todayIso <= end;
      })) return e;
    }
    // fallback: match by epicMonth/year if present
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const byMonth = epics.find((e) => (e.epicMonth === month && (!e.epicYear || e.epicYear === year)));
    return byMonth as any | undefined;
  }, [epicIds, epicsById, getSprintsByEpic, todayIso]);

  const [selectedEpicId, setSelectedEpicId] = useState<string | "">(currentEpic ? currentEpic.id : "");
  const [selectedSprintId, setSelectedSprintId] = useState<string | "">(currentSprint ? currentSprint.id : "");

  const tasks = React.useMemo(() => {
    if (selectedSprintId) return getTasksBySprint(selectedSprintId) || [];
    const all = (taskIds || []).map((id) => tasksById[id]).filter(Boolean) as any[];
    return all;
  }, [taskIds, tasksById, selectedSprintId, getTasksBySprint]);
  const addTodoStore = useRootEpicStore((s) => s.addTodo);

  const [selectedTaskId, setSelectedTaskId] = useState<string | "">("");
  useEffect(() => {
    // initialize defaults when store data loads
    if (!selectedEpicId && currentEpic) setSelectedEpicId(currentEpic.id);
    if (!selectedSprintId && currentSprint) setSelectedSprintId(currentSprint.id);
    // when epic selection changes, update sprint list and reset sprint/task selections
    if (!selectedEpicId) return;
    const sps = getSprintsByEpic(selectedEpicId) || [];
    if (sps.length > 0) {
      // if current selectedSprintId is not in sps, pick the one containing today or first
      if (!selectedSprintId || !sps.find((s: any) => s.id === selectedSprintId)) {
        const todaySprint = sps.find((sp: any) => {
          const start = sp.start || sp.startDate || sp.startAt || null;
          const end = sp.end || sp.endDate || sp.endAt || null;
          return start && end && start <= todayIso && todayIso <= end;
        });
        setSelectedSprintId((todaySprint && todaySprint.id) || sps[0].id);
      }
    } else {
      setSelectedSprintId("");
    }
    setSelectedTaskId("");
  }, [selectedEpicId]);

  useEffect(() => {
    // when sprint changes, reset selected task if it's not present
    if (!selectedSprintId) {
      setSelectedTaskId("");
      return;
    }
    const tlist = getTasksBySprint(selectedSprintId) || [];
    if (!selectedTaskId) return;
    if (!tlist.find((t: any) => t.id === selectedTaskId)) setSelectedTaskId("");
  }, [selectedSprintId]);
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
        sprintId: selectedSprintId || task.sprintId,
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
              Epic
            </label>
            <select
              value={selectedEpicId}
              onChange={(e) => setSelectedEpicId(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none mb-3"
            >
              <option value="">(none)</option>
              { (epicIds || []).map((id) => {
                const e = epicsById[id];
                if (!e) return null;
                return <option key={e.id} value={e.id}>{e.name || e.id}</option>;
              }) }
            </select>

            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Sprint
            </label>
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none mb-3"
            >
              <option value="">Select a sprint</option>
              { (selectedEpicId ? (getSprintsByEpic(selectedEpicId) || []) : (sprintIds || []).map((id) => sprintsById[id]))
                .filter(Boolean)
                .map((sp: any) => (
                  <option key={sp.id} value={sp.id}>{sp.name || sp.sprintLabel || sp.id}</option>
                )) }
            </select>

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
