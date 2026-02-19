"use client";
import React from "react";
import TodoItem from "./TodoItem";
import type { Todo } from "@lib/api/types";

export default function TodoItemsList({
  todos = [],
  checklists = {},
  onDelete,
  onToggleComplete,
  onToggleChecklist,
}: {
  todos?: Todo[];
  checklists?: Record<string, { id: string; title: string; done?: boolean }[]>;
  onDelete?: (id: string) => void;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onToggleChecklist?: (
    todoId: string,
    checklistId: string,
    done: boolean,
  ) => void;
}) {
  if (!todos || todos.length === 0) {
    return <div className="text-sm text-slate-500 p-4">No todos yet</div>;
  }

  return (
    <div className="space-y-3">
      {todos.map((t) => (
        <TodoItem
          key={t.id}
          todo={t}
          checklists={checklists[t.id] || []}
          onDelete={onDelete}
          onToggleComplete={onToggleComplete}
          onToggleChecklist={onToggleChecklist}
        />
      ))}
    </div>
  );
}
