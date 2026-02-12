"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { withBase } from "@lib/api";
import { toast, confirmDialog } from "@lib/ui";
import type { Epic, Sprint } from "@lib/api/types";

export default function EpicControls({
  epicId,
  epicName,
  onEpicUpdated,
}: {
  epicId: string;
  epicName?: string;
  onEpicUpdated?: (epic: Epic) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [epic, setEpic] = useState<Epic | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setDeleting] = useState(false);
  const [showAddSprint, setShowAddSprint] = useState(false);

  // Listen for a global event to open the epic settings modal
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      if (!detail || !detail.epicId) return;
      if (detail.epicId !== epicId) return;
      setOpen(true);
    };
    window.addEventListener("openEpicSettings", handler as EventListener);
    return () =>
      window.removeEventListener("openEpicSettings", handler as EventListener);
  }, [epicId]);

  // load epic details when modal opens
  React.useEffect(() => {
    let mounted = true;
    async function load() {
      if (!open || !epicId) return;
      try {
        const res = await fetch(withBase(`/api/epics/${epicId}`));
        if (!res.ok) return;
        const data = (await res.json()) as Epic;
        if (!mounted) return;
        setEpic(data);
        onEpicUpdated?.(data);
      } catch {
        /* ignore */
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [open, epicId]);

  async function saveEpicName(newName: string) {
    if (!epicId) return;
    setLoading(true);
    try {
      const res = await fetch(withBase(`/api/epics/${epicId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error("Failed to update epic");
      const updated = await res.json();
      // update local state and SWR caches optimistically
      const nextEpic: Epic = {
        ...(epic || {}),
        ...(updated || {}),
        name: (updated && (updated as Record<string, unknown>).name) || newName,
      } as Epic;
      setEpic(nextEpic);
      onEpicUpdated?.(nextEpic);
      mutate(withBase(`/api/epics/${epicId}`), updated || {}, false);
      mutate(
        withBase("/api/epics"),
        (list: unknown) => {
          if (!Array.isArray(list)) return list;
          return (list as Epic[]).map((e) =>
            e.id === epicId ? { ...e, ...(updated || {}) } : e,
          );
        },
        false,
      );
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast("Could not update epic name", "error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSprintById(sprintId: string) {
    if (
      !(await confirmDialog(
        "Delete this sprint and all its tasks/sessions? This cannot be undone.",
      ))
    )
      return;
    try {
      const res = await fetch(withBase(`/api/sprints/${sprintId}`), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete sprint");
      // update local copy and notify parent
      const current = (epic || {}) as Epic;
      const next: Epic = {
        ...current,
        sprints: (current.sprints || []).filter((sp) => sp.id !== sprintId),
      } as Epic;
      setEpic(next);
      onEpicUpdated?.(next);
      // update SWR caches without a full refresh
      mutate(withBase(`/api/epics/${epicId}`), undefined, true);
      mutate(withBase("/api/epics"), undefined, true);
    } catch (err) {
      console.error(err);
      toast("Could not delete sprint", "error");
    }
  }

  // Minimal add-sprint flow as a modal that reuses existing API
  const [newSprintName, setNewSprintName] = useState("Week 1");
  const [creating, setCreating] = useState(false);

  async function createSprint() {
    if (!epicId || !newSprintName) return;
    setCreating(true);
    try {
      const sprintId = `sprint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const payload: Partial<Sprint> = {
        id: sprintId,
        name: newSprintName,
        tasks: [],
        epicId,
      };
      const res = await fetch(withBase(`/api/sprints`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create sprint");
      const created = (await res.json()) as Sprint;
      // update local epic immediately and notify parent
      const current = (epic || {}) as Epic;
      const next: Epic = {
        ...current,
        sprints: [...((current && current.sprints) || []), created],
      } as Epic;
      setEpic(next);
      onEpicUpdated?.(next);
      // update SWR caches without full refresh
      mutate(
        withBase(`/api/epics/${epicId}`),
        (prev: unknown) => {
          if (!prev) return prev;
          const p = prev as Epic;
          return { ...p, sprints: [...(p.sprints || []), created] };
        },
        false,
      );
      mutate(
        withBase("/api/epics"),
        (list: unknown) => {
          if (!Array.isArray(list)) return list;
          return (list as Epic[]).map((e) =>
            e.id === epicId
              ? { ...e, sprints: [...(e.sprints || []), created] }
              : e,
          );
        },
        false,
      );
      setShowAddSprint(false);
    } catch (err) {
      console.error(err);
      toast("Could not create sprint", "error");
    } finally {
      setCreating(false);
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

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Epic Settings
              </h2>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-5 space-y-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Epic Name
                </label>
                <input
                  type="text"
                  value={(epic && epic.name) || epicName || ""}
                  onChange={(e) =>
                    setEpic(
                      (p) =>
                        ({
                          ...(p || {}),
                          name: e.target.value,
                        }) as Epic,
                    )
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sprints
                  </h3>
                  <button
                    onClick={() => {
                      // close epic modal and open add sprint modal
                      setOpen(false);
                      // small timeout to ensure modal stacking behaves
                      setTimeout(() => setShowAddSprint(true), 120);
                    }}
                    className="text-xs font-medium text-emerald-600 hover:underline"
                  >
                    + Add Sprint
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(epic?.sprints || []).map((sp) => (
                    <div
                      key={sp.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs"
                    >
                      <div>
                        <div className="font-medium text-slate-800">
                          {(sp as any).sprintLabel || sp.name}
                        </div>
                        <div className="text-slate-500">
                          {(sp.tasks || []).length} tasks ·{" "}
                          {
                            (sp.tasks || []).filter(
                              (t: any) => (t as any).completed,
                            ).length
                          }{" "}
                          completed
                        </div>
                      </div>
                      <button
                        onClick={() => deleteSprintById(sp.id)}
                        className="text-slate-400 text-sm"
                        aria-label={`Delete sprint ${sp.name}`}
                      >
                        🗑
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-rose-200 bg-rose-50 p-3">
                <p className="text-xs text-rose-700">
                  Deleting this epic will remove all its sprints and tasks.
                </p>
                <button
                  onClick={removeEpic}
                  className="mt-2 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Delete Epic
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  saveEpicName((epic && epic.name) || epicName || "")
                }
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddSprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold">Add Sprint</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Sprint name
                </label>
                <input
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowAddSprint(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={createSprint}
                disabled={creating}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${creating ? "bg-emerald-600 opacity-60 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
