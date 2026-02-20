"use client";
import React, { useState } from "react";
import TodoModal from "./TodoModal";
import type { Todo } from "@lib/api/types";
import {
  updateTodo as apiUpdateTodo,
  deleteTodo as apiDeleteTodo,
} from "@lib/api/todos";
import { getSessionsForTask } from "@lib/api/sessions";
import { getTask } from "@lib/api/index";
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
  const [showModal, setShowModal] = useState(false);
  const completed = !!todo.completed;

  const updateTodoStore = useRootEpicStore((s) => s.updateTodo);
  const removeTodoStore = useRootEpicStore((s) => s.removeTodo);
  const updateChecklistStore = useRootEpicStore((s) => s.updateChecklist);
  const addSessionStore = useRootEpicStore((s) => s.addSession);
  const addTaskStore = useRootEpicStore((s) => s.addTask);

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

    // After toggling completion, refresh sessions for the related task (if any)
    // and add them to the client store so UI reflects updated time/sessions.
    try {
      if (todo?.taskId) {
        const sessions = await getSessionsForTask(todo.taskId as string);
        if (Array.isArray(sessions) && sessions.length > 0) {
          sessions.forEach((s) => addSessionStore(s));
        }
        // Refresh the related Task and add it to the store so task state updates
        try {
          const task = await getTask(todo.taskId as string);
          if (task && (task as any).id) addTaskStore(task as any);
        } catch (err) {
          console.error("Failed to refresh task after todo toggle", err);
        }
      }
    } catch (e) {
      console.error("Failed to refresh sessions after todo toggle", e);
    }
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
      const resp = await apiUpdateChecklist(checklistId, { completed: done });
      updateChecklistStore(checklistId, {
        done: !!((resp as any).completed ?? (resp as any).done),
      });
    } catch (err) {
      console.error(err);
    }
    onToggleChecklist?.(todoId, checklistId, done);
  }

  // lookup sprint and epic names from the store when available
  const sprint = useRootEpicStore((s) =>
    todo.sprintId ? s.sprints.byId[todo.sprintId] : undefined,
  );
  const epicName = useRootEpicStore((s) => {
    const sp = todo.sprintId ? s.sprints.byId[todo.sprintId] : undefined;
    return sp && sp.epicId ? s.epics.byId[sp.epicId]?.name : undefined;
  });

  // prefer checklist items from store (if taskId present), otherwise use prop
  const checklistItems = todo.taskId
    ? useRootEpicStore((s) => s.getChecklistsByTask(todo.taskId as string))
    : [];
  const itemsToRender =
    checklistItems && checklistItems.length > 0
      ? checklistItems
      : checklists || [];
  const totalChecklist = itemsToRender.length;
  const completedChecklist = itemsToRender.filter((c) => c.done).length;
  const checklistCount = totalChecklist;

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
            onClick={() => setShowModal(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setShowModal(true);
            }}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <h3
              className={`text-sm font-medium truncate ${completed ? "text-muted-foreground line-through" : "text-card-foreground"}`}
            >
              {todo.title}
            </h3>

            {completed ? (
              <>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {epicName ? (
                    <span className="truncate">{epicName}</span>
                  ) : null}
                  {sprint ? (
                    <span className="ml-1"> · {sprint.name}</span>
                  ) : null}
                </p>

                <div className="mt-1 flex items-center gap-4 text-[11px] text-muted-foreground">
                  {todo.plannedHours ? <span>{todo.plannedHours}h</span> : null}
                  <span className="font-medium text-emerald-600">{`${completedChecklist} / ${checklistCount}`}</span>
                </div>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {epicName ? (
                    <span className="truncate">{epicName}</span>
                  ) : null}
                  {sprint ? (
                    <span className="ml-1"> · {sprint.name}</span>
                  ) : null}
                </p>

                <div className="mt-1 flex items-center gap-4 text-[11px] text-muted-foreground">
                  {todo.plannedHours ? (
                    <span>{todo.plannedHours}h planned</span>
                  ) : null}
                  <span className="font-medium text-emerald-600">{`${completedChecklist} / ${checklistCount}`}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => !completed && handleDelete(todo.id)}
          aria-label="Delete todo"
          aria-disabled={completed}
          disabled={completed}
          className={`rounded-md p-1.5 text-muted-foreground ${completed ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-500"}`}
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

      {showModal && (
        <TodoModal
          todo={todo}
          checklists={itemsToRender}
          epicName={epicName}
          sprintName={sprint?.name}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
