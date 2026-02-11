"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { withBase } from "../lib/api";
import { toast, confirmDialog } from "../lib/ui";

export default function EpicControls({
  epicId,
  epicName,
}: {
  epicId: string;
  epicName?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(
    epicName ? `${epicName} - Weekly Sprint` : "New Weekly Sprint",
  );
  const [tasks, setTasks] = useState<
    Array<{ id: string; name: string; efforts: number }>
  >([
    {
      id:
        crypto && (crypto as any).randomUUID
          ? (crypto as any).randomUUID()
          : String(Date.now()),
      name: "",
      efforts: 1,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [weekOfMonth, setWeekOfMonth] = useState<number>(1);
  const [maxWeeks, setMaxWeeks] = useState<number>(5);
  // load epic to determine its month/year and compute weeks
  const [epicMeta, setEpicMeta] = useState<{
    epicYear?: number;
    epicMonth?: number;
  } | null>(null);
  React.useEffect(() => {
    let mounted = true;
    async function load() {
      if (!epicId) return;
      try {
        const res = await fetch(withBase(`/api/epics/${epicId}`));
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        setEpicMeta({ epicYear: data.epicYear, epicMonth: data.epicMonth });
        if (data.epicYear && data.epicMonth) {
          const mod = await import("../utils/date");
          const w = mod.weeksInMonth(data.epicYear, data.epicMonth);
          setMaxWeeks(w);
          if (weekOfMonth > w) setWeekOfMonth(w);
        }
      } catch (e) {}
    }
    load();
    return () => {
      mounted = false;
    };
  }, [epicId]);

  function addTask() {
    setTasks((t) => [
      ...t,
      {
        id:
          crypto && (crypto as any).randomUUID
            ? (crypto as any).randomUUID()
            : String(Date.now()),
        name: "",
        efforts: 1,
      },
    ]);
  }

  function updateTask(idx: number, field: string, value: any) {
    setTasks((t) => {
      const copy = [...t];
      (copy[idx] as any)[field] = value;
      return copy;
    });
  }

  function removeTask(idx: number) {
    setTasks((t) => t.filter((_, i) => i !== idx));
  }

  async function submit() {
    if (!name || !weekOfMonth) return;
    setLoading(true);
    try {
      const sprintId =
        crypto && (crypto as any).randomUUID
          ? (crypto as any).randomUUID()
          : `sprint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const mappedTasks = tasks.map((t) => ({
        id:
          t.id || `${sprintId}-task-${Math.random().toString(36).slice(2, 8)}`,
        name: t.name || "Untitled",
        plannedTime: Math.max(0, Number(t.efforts || 0)) * 2 * 3600,
      }));
      const plannedTime = mappedTasks.reduce(
        (s, t) => s + (t.plannedTime || 0),
        0,
      );

      const payload: any = {
        id: sprintId,
        name,
        plannedTime,
        tasks: mappedTasks,
      };
      // attach this sprint to its parent epic
      (payload as any).epicId = epicId;
      (payload as any).weekOfMonth = weekOfMonth;

      const res = await fetch(withBase(`/api/sprints`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let body = null;
        try {
          body = await res.json();
        } catch (e) {}
        const msg =
          (body && (body.error || body.message)) ||
          `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }
      setOpen(false);
      // revalidate epics and the specific epic so the new sprint appears without a full refresh
      mutate(withBase("/api/epics"));
      if (epicId) mutate(withBase(`/api/epics/${epicId}`));
    } catch (err) {
      console.error(err);
      toast("Could not create sprint", "error");
    } finally {
      setLoading(false);
    }
  }

  async function removeEpic() {
    if (!epicId) return;
    if (
      !(await confirmDialog(
        "Delete this epic and all of its sprints and tasks?",
      ))
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(withBase(`/api/epics/${epicId}`), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete epic");
      router.push(withBase("/"));
      mutate(withBase("/api/epics"));
    } catch (err) {
      console.error(err);
      toast("Could not delete epic", "error");
    } finally {
      setDeleting(false);
    }
  }

  const totalHours = tasks.reduce((s, t) => s + Number(t.efforts || 0) * 2, 0);

  return (
    <div className="mt-2 flex flex-col sm:flex-row sm:justify-end gap-3 w-full">
      <button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 flex"
      >
        Create New Weekly Sprint
      </button>
      <button
        onClick={removeEpic}
        disabled={deleting}
        className="w-full sm:w-auto justify-center rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 flex"
      >
        {deleting ? "Deleting..." : "Delete Monthly Epic"}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Create New Weekly Sprint</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Weekly Sprint name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Week of month
                </label>
                <select
                  value={weekOfMonth}
                  onChange={(e) => setWeekOfMonth(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {Array.from({ length: maxWeeks }).map((_, i) => {
                    const w = i + 1;
                    return (
                      <option key={w} value={w}>
                        Week {w}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Tasks</label>
                  <button onClick={addTask} className="text-sm text-indigo-600">
                    + Add task
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {tasks.map((t, idx) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <input
                        placeholder="Task name"
                        value={t.name}
                        onChange={(e) =>
                          updateTask(idx, "name", e.target.value)
                        }
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <input
                        type="number"
                        min={0}
                        value={t.efforts}
                        onChange={(e) =>
                          updateTask(idx, "efforts", Number(e.target.value))
                        }
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                        title="Number of efforts (each effort = 2 hours)"
                      />
                      <button
                        onClick={() => removeTask(idx)}
                        className="text-sm text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Estimated total: {totalHours} hours
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${loading ? "bg-emerald-600 opacity-60 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
