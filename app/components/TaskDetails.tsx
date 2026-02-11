"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "../lib/api";
import { toast, confirmDialog } from "../lib/ui";

type Session = {
  id: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
};

export default function TaskDetails({
  taskId,
  onClose,
  onUpdated,
  onDeleted,
}: {
  taskId: string;
  onClose: () => void;
  onUpdated?: (task: { id: string; name: string }) => void;
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [taskMeta, setTaskMeta] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [tRes, sRes] = await Promise.all([
          fetch(withBase(`/api/tasks/${taskId}`)),
          fetch(withBase(`/api/tasks/${taskId}/sessions`)),
        ]);
        if (!tRes.ok) throw new Error("Failed to load task");
        const t = await tRes.json();
        const ss = sRes.ok ? await sRes.json() : [];
        if (!mounted) return;
        setTaskMeta(t);
        setTaskName(t.name || "");
        setSessions(Array.isArray(ss) ? ss : []);
      } catch (err) {
        console.error(err);
        toast("Could not load task details", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [taskId]);

  function fmtSeconds(sec?: number) {
    if (!sec) return "00:00:00";
    const s = Math.floor(sec % 60);
    const m = Math.floor((sec / 60) % 60);
    const h = Math.floor(sec / 3600);
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  async function save() {
    if (!taskName) return;
    setSaving(true);
    try {
      const res = await fetch(withBase(`/api/tasks/${taskId}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: taskName }),
      });
      if (!res.ok) throw new Error("Failed to save task");
      const updated = await res.json();
      if (typeof onUpdated === "function") {
        onUpdated({ id: updated.id || taskId, name: updated.name || taskName });
      }
      router.refresh();
      onClose();
    } catch (err) {
      console.error(err);
      toast("Could not save task", "error");
    } finally {
      setSaving(false);
    }
  }

  const totalDurationSeconds = (() => {
    const fromSessions = sessions.reduce((a, b) => a + (b.duration || 0), 0);
    if (fromSessions > 0) return fromSessions;

    // If durations aren't present, but we have timestamps on sessions and/or
    // the task itself, compute total as last end - first start.
    const startCandidates: number[] = [];
    const endCandidates: number[] = [];

    let hasOpen = false;
    sessions.forEach((s) => {
      if (s.startedAt) {
        startCandidates.push(new Date(s.startedAt).getTime());
      }
      if (s.endedAt) {
        endCandidates.push(new Date(s.endedAt).getTime());
      } else if (s.startedAt && !s.endedAt) {
        hasOpen = true;
      }
    });

    if (taskMeta?.startedAt) {
      startCandidates.push(new Date(taskMeta.startedAt).getTime());
    }
    if (taskMeta?.endedAt) {
      endCandidates.push(new Date(taskMeta.endedAt).getTime());
    }

    if (hasOpen && endCandidates.length === 0 && startCandidates.length > 0) {
      endCandidates.push(Date.now());
    }

    if (startCandidates.length > 0 && endCandidates.length > 0) {
      const minStart = Math.min(...startCandidates);
      const maxEnd = Math.max(...endCandidates);
      const diffSec = Math.max(0, Math.floor((maxEnd - minStart) / 1000));
      if (diffSec > 0) return diffSec;
    }

    if (
      typeof taskMeta?.timeActuallySpent === "number" &&
      taskMeta.timeActuallySpent > 0
    ) {
      return taskMeta.timeActuallySpent;
    }
    if (typeof taskMeta?.timeSpent === "number" && taskMeta.timeSpent > 0) {
      return taskMeta.timeSpent;
    }
    return 0;
  })();

  const firstSessionStart: Date | null = sessions.reduce(
    (min, s) => {
      if (!s.startedAt) return min;
      const d = new Date(s.startedAt);
      if (!min || d < min) return d;
      return min;
    },
    null as Date | null,
  );

  async function remove() {
    if (!(await confirmDialog("Remove this task and all its sessions?")))
      return;
    try {
      const res = await fetch(withBase(`/api/tasks/${taskId}`), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      if (typeof onDeleted === "function") {
        onDeleted(taskId);
      }
      onClose();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast("Could not remove task", "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Task Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Task Name
            </label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Status</span>
              <div className="mt-1 inline-block rounded-full bg-yellow-100 px-2 py-0.5 font-medium text-yellow-700">
                {taskMeta?.completed
                  ? "Completed"
                  : taskMeta
                    ? "In Progress"
                    : "—"}
              </div>
            </div>

            <div>
              <span className="text-slate-500">Total Time</span>
              <div className="mt-1 font-mono text-sm font-semibold text-slate-900">
                {fmtSeconds(totalDurationSeconds)}
              </div>
            </div>

            <div>
              <span className="text-slate-500">Started On</span>
              <div className="mt-1 text-slate-800">
                {firstSessionStart
                  ? firstSessionStart.toLocaleString()
                  : taskMeta?.startedAt
                    ? new Date(taskMeta.startedAt).toLocaleString()
                    : "—"}
              </div>
            </div>

            <div>
              <span className="text-slate-500">Sessions</span>
              <div className="mt-1 text-slate-800">{sessions.length}</div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold text-slate-700">
              Sessions
            </h3>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <span className="font-mono text-slate-700">
                    {s.startedAt
                      ? new Date(s.startedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                    {s.endedAt
                      ? ` → ${new Date(s.endedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                  </span>
                  <span className="text-slate-500">
                    {s.duration ? Math.round(s.duration / 60) + " min" : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <p className="mb-2 text-xs text-rose-700">
              Removing a task will permanently delete all its sessions.
            </p>
            <button
              onClick={remove}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Remove Task
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
