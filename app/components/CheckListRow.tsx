"use client";

import React, { useState } from "react";
import { FiCheck, FiEdit2, FiX, FiTrash2 } from "react-icons/fi";
import type { ChecklistItem } from "@stores/types";

function CheckListRow({
  item,
  onComplete,
  onUncomplete,
  onRename,
  onDelete,
}: {
  item: ChecklistItem;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.title);

  function handleRename() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onRename(item.id, trimmed);
    setEditing(false);
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-card text-card-foreground border border-border rounded-lg px-3 py-2">
      {/* Left Side */}
      <div className="flex items-center gap-3 flex-1">
        {/* Complete Button */}
        <button
          onClick={() =>
            item.done ? onUncomplete(item.id) : onComplete(item.id)
          }
          className={`p-1.5 rounded-full transition active:scale-95 ${
            item.done
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-muted hover:opacity-90 text-foreground"
          }`}
        >
          <FiCheck size={14} />
        </button>

        {/* Title */}
        {editing ? (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setEditing(false);
                setValue(item.title);
              }
            }}
            autoFocus
            className="text-sm flex-1 bg-transparent text-foreground outline-none"
          />
        ) : (
          <p
            onDoubleClick={() => setEditing(true)}
            className={`text-sm cursor-pointer ${
              item.done
                ? "line-through text-muted-foreground"
                : "text-foreground"
            }`}
          >
            {item.title}
          </p>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-md bg-muted hover:opacity-90 text-foreground active:scale-95 transition"
          >
            <FiEdit2 size={14} />
          </button>
        )}

        {editing && (
          <button
            onClick={() => {
              setEditing(false);
              setValue(item.title);
            }}
            className="p-1.5 rounded-md bg-muted hover:opacity-90 text-foreground active:scale-95 transition"
          >
            <FiX size={14} />
          </button>
        )}

        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white active:scale-95 transition"
        >
          <FiTrash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default CheckListRow;
