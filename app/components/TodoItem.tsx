"use client";
import React, { useState } from "react";
import type { Todo } from "@lib/api/types";
import {
  updateTodo as apiUpdateTodo,
  deleteTodo as apiDeleteTodo,
} from "@lib/api/todos";
import { updateChecklist as apiUpdateChecklist } from "@lib/api/checklists";
import useRootEpicStore from "@stores/rootEpicStore";

export default function TodoItem({
  todo,
  checklists = [],
  onDelete,
  onToggleComplete,
  onToggleChecklist,
}: {
  todo: Todo;
  checklists?: { id: string; title: string; done?: boolean }[];
  onDelete?: (id: string) => void;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onToggleChecklist?: (
    todoId: string,
    checklistId: string,
    done: boolean,
  ) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const completed = !!todo.completed;

  const updateTodoStore = useRootEpicStore((s) => s.updateTodo);
  const removeTodoStore = useRootEpicStore((s) => s.removeTodo);
  const updateChecklistStore = useRootEpicStore((s) => s.updateChecklist);

  async function handleToggleComplete(id: string, checked: boolean) {
    try {
      const resp = await apiUpdateTodo(id, { completed: checked });
      updateTodoStore(id, {
        completed: !!resp.completed,
        completedAt: (resp as any).completedAt,
      });
    } catch (err) {
      console.error(err);
    }
    onToggleComplete?.(id, checked);
  }

  async function handleDelete(id: string) {
    try {
      await apiDeleteTodo(id);
      removeTodoStore(id);
    } catch (err) {
      console.error(err);
    }
    onDelete?.(id);
  }

  async function handleToggleChecklist(
    todoId: string,
    checklistId: string,
    done: boolean,
  ) {
    try {
      const resp = await apiUpdateChecklist(checklistId, { done });
      updateChecklistStore(checklistId, { done: !!(resp as any).done });
    } catch (err) {
      console.error(err);
    }
    onToggleChecklist?.(todoId, checklistId, done);
  }

  const totalChecklist = (checklists || []).length;
  const completedChecklist = (checklists || []).filter((c) => c.done).length;

  return (
    <div
      className={`rounded-lg border border-border bg-card px-4 py-3 ${completed ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => handleToggleComplete(todo.id, e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border text-emerald-600 bg-card focus:ring-emerald-500"
          />

          <div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded((s) => !s)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setExpanded((s) => !s);
            }}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <h3
              className={`text-sm font-medium truncate ${completed ? "text-muted-foreground line-through" : "text-card-foreground"}`}
            >
              {todo.title}
            </h3>

            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {todo.sprintId ? "Sprint" : ""}{" "}
              {todo.dueDate ? `· ${todo.dueDate}` : ""}
            </p>

            {!completed && (
              <div className="mt-1 flex items-center gap-4 text-[11px] text-muted-foreground">
                {totalChecklist > 0 ? (
                  <span>{`${completedChecklist}/${totalChecklist} checklist`}</span>
                ) : (
                  <span>—</span>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => handleDelete(todo.id)}
          aria-label="Delete todo"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M3 6h18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10 11v6M14 11v6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 6V4h6v2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-slate-100 pt-3 space-y-2 dark:border-gray-800">
          {totalChecklist ? (
            checklists.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 text-sm text-card-foreground"
              >
                <input
                  type="checkbox"
                  checked={!!c.done}
                  onChange={(e) =>
                    handleToggleChecklist(todo.id, c.id, e.target.checked)
                  }
                  className="h-4 w-4 rounded-full border-border text-emerald-600 bg-card"
                />
                <span
                  className={`${c.done ? "line-through text-muted-foreground" : ""}`}
                >
                  {c.title}
                </span>
              </label>
            ))
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              No checklist items
            </div>
          )}
        </div>
      )}
    </div>
  );
}
