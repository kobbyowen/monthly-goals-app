"use client";
import React, { useEffect, useRef, useState } from "react";
import type { Todo } from "@lib/api/types";
import { updateTodo as apiUpdateTodo } from "@lib/api/todos";
import { updateChecklist as apiUpdateChecklist } from "@lib/api/checklists";
import useRootEpicStore from "@stores/rootEpicStore";

export default function TodoModal({
  todo,
  checklists = [],
  epicName,
  sprintName,
  onClose,
}: {
  todo: Todo;
  checklists?: { id: string; title: string; done?: boolean }[];
  epicName?: string;
  sprintName?: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(todo.title || "");
  const [plannedHours, setPlannedHours] = useState<number | "">(
    typeof todo.plannedHours === "number" ? todo.plannedHours : "",
  );

  const updateTodoStore = useRootEpicStore((s) => s.updateTodo);
  const updateChecklistStore = useRootEpicStore((s) => s.updateChecklist);
  const storeChecklists = todo.taskId
    ? useRootEpicStore((s) => s.getChecklistsByTask(todo.taskId as string))
    : [];

  const titleTimer = useRef<number | null>(null);
  const hoursTimer = useRef<number | null>(null);

  useEffect(() => {
    setTitle(todo.title || "");
    setPlannedHours(
      typeof todo.plannedHours === "number" ? todo.plannedHours : "",
    );
  }, [todo]);

  // autosave title (debounced)
  useEffect(() => {
    if (titleTimer.current) window.clearTimeout(titleTimer.current);
    titleTimer.current = window.setTimeout(async () => {
      try {
        await apiUpdateTodo(todo.id, { title });
        updateTodoStore(todo.id, { title });
      } catch (e) {
        console.error(e);
      }
    }, 600);
    return () => {
      if (titleTimer.current) window.clearTimeout(titleTimer.current);
    };
  }, [title, todo.id, updateTodoStore]);

  // autosave plannedHours (debounced)
  useEffect(() => {
    if (hoursTimer.current) window.clearTimeout(hoursTimer.current);
    hoursTimer.current = window.setTimeout(async () => {
      try {
        const val = typeof plannedHours === "number" ? plannedHours : 0;
        await apiUpdateTodo(todo.id, { plannedHours: val });
        updateTodoStore(todo.id, { plannedHours: val });
      } catch (e) {
        console.error(e);
      }
    }, 600);
    return () => {
      if (hoursTimer.current) window.clearTimeout(hoursTimer.current);
    };
  }, [plannedHours, todo.id, updateTodoStore]);

  // close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleChecklistToggle(checklistId: string, done: boolean) {
    try {
      const resp = await apiUpdateChecklist(checklistId, { completed: done });
      updateChecklistStore(checklistId, {
        done: !!((resp as any).completed ?? (resp as any).done),
      });
    } catch (err) {
      console.error(err);
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
          <h2 className="text-sm font-semibold">Edit Todo</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-card-foreground"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="text-xs text-muted-foreground">
            Changes are auto-saved
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Planned Time (hours)
            </label>
            <input
              type="number"
              min="0"
              step="0.25"
              value={plannedHours as any}
              onChange={(e) =>
                setPlannedHours(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="text-xs text-muted-foreground">
            {epicName ? <span className="truncate">{epicName}</span> : null}
            {sprintName ? <span className="ml-1"> · {sprintName}</span> : null}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Goals Checklist
            </h3>
            <div className="space-y-2">
              {(storeChecklists && storeChecklists.length > 0
                ? storeChecklists
                : checklists || []
              ).length > 0 ? (
                (storeChecklists && storeChecklists.length > 0
                  ? storeChecklists
                  : checklists || []
                ).map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-sm text-card-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={!!c.done}
                      onChange={(e) =>
                        handleChecklistToggle(c.id, e.target.checked)
                      }
                      className="h-4 w-4 rounded-full border-border text-emerald-600 bg-card"
                    />
                    <span
                      className={`${c.done ? "line-through text-muted-foreground" : "text-card-foreground"}`}
                    >
                      {c.title}
                    </span>
                  </label>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  No checklist items
                </div>
              )}
            </div>
          </div>
        </div>
        {/* footer removed per design; modal closes when clicking outside */}
      </div>
    </div>
  );
}
