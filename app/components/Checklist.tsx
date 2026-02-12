"use client";

import React, { useEffect, useRef, useState } from "react";
import { withBase } from "@lib/api";
import { toast, confirmDialog } from "@lib/ui";

type Item = {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string | null;
};

export default function Checklist({
  taskId,
  compact = false,
}: {
  taskId: string;
  compact?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(withBase(`/api/tasks/${taskId}/checklists`));
        if (res.ok) {
          const data = await res.json();
          if (mounted) setItems(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error(e);
        toast("Could not load checklist", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [taskId]);

  async function addItem() {
    if (!newTitle || !newTitle.trim()) return toast("Title required", "error");
    setAdding(true);
    try {
      const res = await fetch(withBase(`/api/tasks/${taskId}/checklists`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!res.ok) throw new Error("Create failed");
      const created = await res.json();
      setItems((s) => [...s, created]);
      setNewTitle("");
      try {
        window?.dispatchEvent?.(
          new CustomEvent("checklist:changed", { detail: { taskId } }),
        );
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      console.error(e);
      toast("Could not add item", "error");
    } finally {
      setAdding(false);
    }
  }

  async function toggle(item: Item) {
    try {
      const res = await fetch(withBase(`/api/checklists/${item.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !item.completed }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setItems((s) => s.map((it) => (it.id === updated.id ? updated : it)));
      try {
        window?.dispatchEvent?.(
          new CustomEvent("checklist:changed", { detail: { taskId } }),
        );
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      console.error(e);
      toast("Could not update item", "error");
    }
  }

  async function remove(item: Item) {
    if (!(await confirmDialog("Delete checklist item?"))) return;
    try {
      const res = await fetch(withBase(`/api/checklists/${item.id}`), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setItems((s) => s.filter((it) => it.id !== item.id));
      try {
        window?.dispatchEvent?.(
          new CustomEvent("checklist:changed", { detail: { taskId } }),
        );
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      console.error(e);
      toast("Could not delete item", "error");
    }
  }

  async function rename(item: Item, title: string) {
    if (!title || !title.trim()) return toast("Title required", "error");
    try {
      const res = await fetch(withBase(`/api/checklists/${item.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setItems((s) => s.map((it) => (it.id === updated.id ? updated : it)));
      try {
        window?.dispatchEvent?.(
          new CustomEvent("checklist:changed", { detail: { taskId } }),
        );
      } catch (e) {
        /* ignore */
      }
    } catch (e) {
      console.error(e);
      toast("Could not rename item", "error");
    }
  }

  if (compact) {
    return (
      <div className="space-y-1">
        {!loading && items.length === 0 && (
          <div className="text-xs text-slate-400">No checklist items.</div>
        )}
        {!loading &&
          items.map((it) => (
            <label
              key={it.id}
              className="flex items-center gap-3 text-xs cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!it.completed}
                onChange={() => toggle(it)}
                className="peer hidden"
              />

              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${it.completed ? "border-emerald-600 bg-emerald-600" : "border-slate-300 peer-checked:border-emerald-600 peer-checked:bg-emerald-600"}`}
              >
                <svg
                  className={`${it.completed ? "h-3 w-3 text-white" : "hidden peer-checked:block h-3 w-3 text-white"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <span
                className={
                  it.completed
                    ? "text-slate-400 line-through"
                    : "text-slate-800"
                }
              >
                {it.title}
              </span>
            </label>
          ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Checklist
        </h3>
        <button
          className="text-xs font-medium text-emerald-600 hover:underline"
          onClick={() => {
            setShowAdd((s) => {
              const next = !s;
              if (!s) setTimeout(() => inputRef.current?.focus(), 50);
              return next;
            });
          }}
        >
          + Add Item
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <div className="mt-1">
          {items.length > 0 && (
            <div className="mb-2 flex items-center gap-1">
              {items.map((it) => (
                <div
                  key={`ind-${it.id}`}
                  className={`h-2 w-2 rounded-full ${it.completed ? "bg-emerald-500" : "bg-slate-300"}`}
                  aria-hidden
                />
              ))}
            </div>
          )}

          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {showAdd && (
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Add checklist item"
                  className="flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm"
                />
                <button
                  onClick={addItem}
                  disabled={adding}
                  aria-label="Add checklist item"
                  className={`h-7 w-7 rounded-full inline-flex items-center justify-center text-white ${adding ? "bg-emerald-600 opacity-60" : "bg-emerald-600 hover:bg-emerald-700"}`}
                >
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>

                <button
                  onClick={() => {
                    setShowAdd(false);
                    setNewTitle("");
                  }}
                  disabled={adding}
                  aria-label="Cancel adding checklist item"
                  className="h-7 w-7 rounded-full inline-flex items-center justify-center text-rose-600 bg-white ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M19 7L7 19M7 7l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {loading && <div className="text-xs text-slate-400">Loading…</div>}

            {!loading && items.length === 0 && (
              <div className="text-xs text-slate-400">No checklist items.</div>
            )}

            {!loading &&
              items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 transition"
                >
                  <input
                    id={`chk-${it.id}`}
                    type="checkbox"
                    checked={!!it.completed}
                    onChange={() => toggle(it)}
                    className="peer hidden"
                  />

                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${it.completed ? "border-emerald-600 bg-emerald-600" : "border-slate-300 peer-checked:border-emerald-600 peer-checked:bg-emerald-600"} transition cursor-pointer`}
                    onClick={() => toggle(it)}
                  >
                    <svg
                      className={`${it.completed ? "h-3 w-3 text-white" : "hidden peer-checked:block h-3 w-3 text-white"}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>

                  <EditableTitle
                    initial={it.title}
                    onSave={(t) => rename(it, t)}
                    completed={!!it.completed}
                  />

                  <div className="flex-1" />

                  <button
                    onClick={() => remove(it)}
                    className="h-7 w-7 rounded-full inline-flex items-center justify-center text-rose-600 bg-white ring-1 ring-slate-200 hover:scale-105"
                    aria-label="Delete checklist item"
                  >
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6M10 6V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableTitle({
  initial,
  onSave,
  completed,
}: {
  initial: string;
  onSave: (s: string) => void;
  completed: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(initial);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) setVal(initial);
  }, [initial, editing]);

  useEffect(() => {
    if (!editing) return;
    if (val.trim() === initial.trim()) {
      setSaving(false);
      return;
    }
    setSaving(true);
    const t = setTimeout(async () => {
      try {
        await onSave(val.trim());
      } catch (e) {
        console.error(e);
      } finally {
        setSaving(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [val, editing, initial, onSave]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <span
        className={`text-slate-800 ${completed ? "text-slate-400 line-through" : ""} ${completed ? "cursor-default" : "cursor-text"}`}
        onClick={() => {
          if (!completed) setEditing(true);
        }}
        role={completed ? undefined : "button"}
        tabIndex={completed ? -1 : 0}
        onKeyDown={(e) => {
          if (!completed && e.key === "Enter") setEditing(true);
        }}
      >
        {initial}
      </span>
    );
  }

  return (
    <div className="flex w-full items-center gap-2">
      <input
        ref={inputRef}
        className="flex-1 bg-transparent border-0 px-0 py-0 text-sm outline-none"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setVal(initial);
            setEditing(false);
          }
        }}
        onBlur={async () => {
          if (val.trim() && val.trim() !== initial.trim()) {
            setSaving(true);
            try {
              await onSave(val.trim());
            } catch (e) {
              console.error(e);
            } finally {
              setSaving(false);
            }
          }
          setEditing(false);
        }}
      />
      <div className="flex items-center gap-2">
        {saving ? (
          <span className="text-xs text-slate-400">Saving…</span>
        ) : (
          <svg
            className="h-4 w-4 text-emerald-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
  );
}
