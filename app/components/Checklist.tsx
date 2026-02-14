"use client";

import React, { useCallback, useState } from "react";
import CheckListRow from "./CheckListRow";
import { useRootEpicStore } from "../stores";
import { useShallow } from "zustand/shallow";
import {
  createChecklistForTask,
  updateChecklist as apiUpdateChecklist,
  deleteChecklist as apiDeleteChecklist,
} from "@api/checklists";
import { toast } from "../lib/ui";

type Props = {
  taskId: string;
  compact?: boolean;
};

export default function CheckList({ taskId, compact }: Props) {
  const [items, addChecklist, updateChecklist, removeChecklist] =
    useRootEpicStore(
      useShallow((s) => [
        s.getChecklistsByTask(taskId),
        s.addChecklist,
        s.updateChecklist,
        s.removeChecklist,
      ]),
    );

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleCreate = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const created = await createChecklistForTask(taskId, title);
      // normalize API shape: server may return `completed` — store uses `done`
      addChecklist({ ...created, done: created.completed ?? created.done });
      setNewTitle("");
    } catch (err) {
      toast("checklist failed", "error");
    } finally {
      setCreating(false);
    }
  }, [newTitle, taskId, addChecklist]);

  const handleComplete = useCallback(
    async (id: string) => {
      try {
        const updated = await apiUpdateChecklist(id, { completed: true });
        updateChecklist(updated.id, {
          ...updated,
          done: updated.completed ?? updated.done,
        });
      } catch (err) {
        toast("checklist failed", "error");
      }
    },
    [updateChecklist],
  );

  const handleUncomplete = useCallback(
    async (id: string) => {
      try {
        const updated = await apiUpdateChecklist(id, { completed: false });
        updateChecklist(updated.id, {
          ...updated,
          done: updated.completed ?? updated.done,
        });
      } catch (err) {
        toast("checklist failed", "error");
      }
    },
    [updateChecklist],
  );

  const handleRename = useCallback(
    async (id: string, title: string) => {
      try {
        const updated = await apiUpdateChecklist(id, { title });
        updateChecklist(updated.id, {
          ...updated,
          done: updated.completed ?? updated.done,
        });
      } catch (err) {
        toast("checklist failed", "error");
      }
    },
    [updateChecklist],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await apiDeleteChecklist(id);
        removeChecklist(id);
      } catch (err) {
        toast("checklist failed", "error");
      }
    },
    [removeChecklist],
  );

  return (
    <div className={`space-y-2 ${compact ? "text-sm" : ""}`}>
      {items.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white/50 px-3 py-3 text-sm text-slate-500">
          No checklist items.
        </div>
      ) : (
        items.map((item) => (
          <CheckListRow
            key={item.id}
            item={item}
            onComplete={handleComplete}
            onUncomplete={handleUncomplete}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
}
