"use client";
import React, { useEffect, useMemo, useState } from "react";
import useRootEpicStore from "@stores/rootEpicStore";
import { useShallow } from "zustand/shallow";
import { generateTodos as apiGenerateTodos } from "@lib/api/todos";
import { toast } from "../lib/ui";

export default function GenerateTodosModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (items: any[]) => void;
}) {
  const epics = useRootEpicStore(
    useShallow((s) => s.epics.allIds.map((id) => s.epics.byId[id])),
  );
  const getSprintsByEpic = useRootEpicStore((s) => s.getSprintsByEpic);
  const getTasksBySprint = useRootEpicStore((s) => s.getTasksBySprint);
  const getSessionsByTask = useRootEpicStore((s) => s.getSessionsByTask);
  const addTodos = useRootEpicStore((s) => (s as any).addTodos);

  const [selectedEpic, setSelectedEpic] = useState<string | "">("");
  const [selectedSprint, setSelectedSprint] = useState<string | "">("");
  const [hours, setHours] = useState<number>(0);
  const [includedTasks, setIncludedTasks] = useState<Record<string, boolean>>(
    {},
  );

  const sprints = useMemo(
    () => (selectedEpic ? getSprintsByEpic(selectedEpic) : []),
    [selectedEpic, getSprintsByEpic],
  );

  useEffect(() => {
    if (open && epics && epics.length) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // 1-12
      // prefer epic matching current month/year
      const current = epics.find(
        (p: any) => p.epicYear === year && p.epicMonth === month,
      );
      const e = (current && current.id) || epics[0].id;
      setSelectedEpic((prev) => prev || e);
    }
  }, [open, epics]);

  useEffect(() => {
    if (sprints && sprints.length) {
      setSelectedSprint((prev) => prev || sprints[0].id);
    }
  }, [sprints]);

  const tasks = useMemo(
    () => (selectedSprint ? getTasksBySprint(selectedSprint) : []),
    [selectedSprint, getTasksBySprint],
  );

  useEffect(() => {
    // default include all tasks
    const map: Record<string, boolean> = {};
    (tasks || []).forEach((t: any) => (map[t.id] = !t.completed));
    setIncludedTasks(map);
  }, [tasks]);

  // compute totals (normalize seconds/hours and prefer task-level spent values)
  const totals = useMemo(() => {
    const toSeconds = (val: any) => {
      const n = Number(val) || 0;
      return n > 1000 ? n : n * 3600; // if value looks large -> seconds, else hours->seconds
    };

    const totalNeededSeconds = (tasks || []).reduce((sum: number, t: any) => {
      const planned =
        typeof t.plannedTime !== "undefined" ? toSeconds(t.plannedTime) : 0;
      return sum + planned;
    }, 0);

    const totalUsedSeconds = (tasks || []).reduce((sum: number, t: any) => {
      const sessions = getSessionsByTask ? getSessionsByTask(t.id) : [];
      const sessionsSecs = Array.isArray(sessions)
        ? sessions.reduce(
            (s2: number, s: any) =>
              s2 + (Number(s.seconds || s.duration || 0) || 0),
            0,
          )
        : 0;

      if (t && (t.completed === true || t.completed === "true")) {
        const spent = t.plannedTime ?? t.timeSpent ?? 0;
        const spentSecs = spent ? toSeconds(spent) : sessionsSecs;
        return sum + spentSecs;
      }

      return sum + sessionsSecs;
    }, 0);

    const totalNeeded = Math.round((totalNeededSeconds || 0) / 3600);
    const totalUsedHours = Math.round((totalUsedSeconds || 0) / 3600);

    // days left in sprint
    let daysLeft = 1;
    if (selectedSprint) {
      const sp = (sprints || []).find((s: any) => s.id === selectedSprint);
      const endStr = sp
        ? sp.end ||
          (sp as any).dateExpectedToEnd ||
          (sp as any).dateExpectedToEnd
        : undefined;
      if (sp && endStr) {
        const end = Date.parse(endStr);
        const now = new Date();
        const diff = Math.ceil((end - now.getTime()) / (1000 * 60 * 60 * 24));
        daysLeft = Math.max(1, diff);
      }
    }

    const remainingHours = Math.max(0, totalNeeded - totalUsedHours);
    const recommended = Math.min(
      16,
      Math.max(1, Math.ceil(remainingHours / Math.max(1, daysLeft))),
    );

    return { totalNeeded, totalUsedHours, daysLeft, recommended };
  }, [tasks, getSessionsByTask, selectedSprint, sprints]);

  // prefill hours input with recommended when modal opens
  useEffect(() => {
    if (open && totals && typeof totals.recommended === "number") {
      setHours(totals.recommended);
    }
  }, [open, totals.recommended]);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const taskIds = Object.keys(includedTasks).filter((k) => includedTasks[k]);
    if (!selectedSprint || taskIds.length === 0) return;
    // guard: do not create if all tasks for sprint are already completed
    const allCompleted =
      (tasks || []).length > 0 &&
      (tasks || []).every((t: any) => !!t.completed);
    if (allCompleted) return;
    try {
      setLoading(true);
      const resp = await apiGenerateTodos({
        sprint_id: selectedSprint,
        epic_id: selectedEpic || undefined,
        task_ids: taskIds,
        allocated_time_today: Number(hours || 0) * 3600,
      });
      const created = (resp && (resp as any).created) || [];
      // add to store
      addTodos(created);
      onCreated?.(created);
      toast(`${created.length} todos created`, "success");
      onClose();
    } catch (err) {
      console.error(err);
      toast("Failed to generate todos", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card text-card-foreground flex flex-col max-h-[90vh] overflow-auto">
        <div className="border-b border-border px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold">Generate Todos for Today</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create today’s tasks based on your sprint goals.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:opacity-80 ml-4"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Epic</p>
              <div className="mt-1">
                <select
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-card-foreground placeholder-muted-foreground"
                  value={selectedEpic}
                  onChange={(e) => setSelectedEpic(e.target.value)}
                >
                  {(epics || []).map((ep: any) => (
                    <option key={ep.id} value={ep.id}>
                      {ep.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Sprint
              </p>
              <div className="mt-1">
                <select
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-card-foreground placeholder-muted-foreground"
                  value={selectedSprint}
                  onChange={(e) => setSelectedSprint(e.target.value)}
                >
                  {(sprints || []).map((sp: any) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Hours you are dedicating today
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value || 0))}
              className="w-full rounded-md border border-border bg-card text-card-foreground px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />

            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <p>
                Total hours needed for sprint:{" "}
                <span className="font-medium">{totals.totalNeeded}h</span>
              </p>
              <p>
                Total hours already used:{" "}
                <span className="font-medium">
                  {Math.round(totals.totalUsedHours)}h
                </span>
              </p>
              <p>
                Recommended hours for today:{" "}
                <span className="font-medium text-emerald-600">
                  {totals.recommended}h
                </span>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Goals to Include
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              All tasks are selected by default. Unselect any you don't want
              included.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Recurring tasks create a daily todo.
            </p>

            <div className="mt-3 space-y-2">
              <div className="max-h-64 overflow-auto pr-2 scrollbar-thin scrollbar-thumb-slate-400">
                {(tasks || []).map((t: any) => {
                  const isCompleted = !!t.completed;

                  // compute used seconds for this task from sessions
                  const sessionsForTask = getSessionsByTask
                    ? getSessionsByTask(t.id)
                    : [];
                  const sessionsSecs = Array.isArray(sessionsForTask)
                    ? sessionsForTask.reduce(
                        (s2: number, s: any) =>
                          s2 + (Number(s.seconds || s.duration || 0) || 0),
                        0,
                      )
                    : 0;

                  // interpret plannedTime: if looks like seconds (>1000) treat as seconds, else hours->seconds
                  const plannedRaw =
                    typeof t.plannedTime !== "undefined"
                      ? Number(t.plannedTime)
                      : typeof t.estimate !== "undefined"
                        ? Number(t.estimate)
                        : 0;
                  const plannedSec =
                    plannedRaw > 1000 ? plannedRaw : plannedRaw * 3600;
                  const remainingSec = Math.max(
                    0,
                    Math.round(plannedSec - sessionsSecs),
                  );

                  const remainingLabel =
                    remainingSec > 0
                      ? remainingSec >= 3600
                        ? `${Math.round(remainingSec / 3600)}h left`
                        : remainingSec >= 60
                          ? `${Math.round(remainingSec / 60)}m left`
                          : `${remainingSec}s left`
                      : "";

                  return (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm ${isCompleted ? "opacity-70" : ""}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={!isCompleted ? !!includedTasks[t.id] : false}
                          disabled={isCompleted}
                          onChange={(e) =>
                            setIncludedTasks((s) => ({
                              ...s,
                              [t.id]: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-border text-emerald-600 bg-card"
                        />
                        <span
                          className={`${isCompleted ? "line-through text-muted-foreground" : "text-card-foreground"} flex-1 min-w-0 overflow-hidden truncate whitespace-nowrap`}
                        >
                          {t.name || t.title || t.name}
                        </span>
                        {t.recurring ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px]">
                            Recurring
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {isCompleted ? "Completed" : t.priority || "High"}
                        </span>
                        {!isCompleted && remainingLabel ? (
                          <span className="text-xs text-muted-foreground">
                            {remainingLabel}
                          </span>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-semibold text-muted-foreground"
          >
            Cancel
          </button>
          {(tasks || []).length > 0 &&
          (tasks || []).every((t: any) => !!t.completed) ? (
            <button
              className="rounded-md px-4 py-2 text-sm font-semibold text-muted-foreground"
              disabled
            >
              All tasks completed
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${loading ? "bg-slate-400" : "bg-emerald-600"}`}
            >
              {loading ? "Creating..." : "Create Todos"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
