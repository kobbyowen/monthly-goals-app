"use client";

import React, { useState } from "react";
import { useRootEpicStore } from "../stores";
import { FiCheck, FiPlus } from "react-icons/fi";
import { createChecklistForTask } from "@api/checklists";
import { toast } from "../lib/ui";

export default function AddChecklistItem({
  taskId,
  onAdded,
}: {
  taskId: string;
  onAdded?: () => void;
}) {
  const addChecklist = useRootEpicStore((s) => s.addChecklist);

  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const trimmed = value.trim();
  const disabled = !trimmed || loading;

  async function handleAdd() {
    if (disabled) return;
    setLoading(true);
    try {
      const created = await createChecklistForTask(taskId, trimmed);
      // normalize API shape: server uses `completed`; store uses `done`
      addChecklist({
        ...created,
        done: (created as any).completed ?? (created as any).done,
      } as any);
      setValue("");
      onAdded?.();
    } catch (err) {
      toast("failed to add checklist", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-slate-300 px-3 py-2">
      {/* Disabled Check Icon */}
      <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 text-slate-300">
        <FiCheck size={12} />
      </div>

      {/* Input */}
      <input
        type="text"
        value={value}
        placeholder="Add checklist item..."
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
          }
        }}
        disabled={loading}
        className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
      />

      {/* Add Button */}
      <button
        onClick={handleAdd}
        disabled={disabled}
        className={`flex h-6 w-6 items-center justify-center rounded-full text-white transition active:scale-95 ${
          disabled
            ? "bg-slate-300 cursor-not-allowed"
            : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        <FiPlus size={14} />
      </button>
    </div>
  );
}
