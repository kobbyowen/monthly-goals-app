"use client";

import React, { useState } from "react";
import { useRootEpicStore } from "../stores";
import { useShallow } from "zustand/shallow";
import { createTask } from "@lib/api/tasks";
import { createChecklistForTask } from "@lib/api/checklists";
import { toast } from "../lib/ui";

export default function AddTaskModal({
  sprintId,
  onClose,
}: {
  sprintId: string;
  onClose: () => void;
}) {
  const [sprintsById, sprintsAllIds, storeAddTask, storeAddChecklist] =
    useRootEpicStore(
      useShallow((s) => [
        s.sprints.byId,
        s.sprints.allIds,
        s.addTask,
        s.addChecklist,
      ]),
    );

  const sprints = React.useMemo(() => {
    return (sprintsAllIds || []).map((id) => sprintsById[id]);
  }, [sprintsAllIds, sprintsById]);

  const [title, setTitle] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [selectedSprintId, setSelectedSprintId] = useState(sprintId);
  const [checklistText, setChecklistText] = useState("");

  /* -------------------------
     Placeholder Utility
  -------------------------- */

  function parseChecklist(text: string) {
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((title, idx) => ({ title, position: idx + 1 }));
  }

  function convertHoursToSeconds(hours: string) {
    const num = parseFloat(hours as any);
    if (Number.isNaN(num) || num <= 0) return 0;
    return Math.round(num * 3600);
  }

  /* -------------------------
     Save Handler
  -------------------------- */

  async function onSaveChanges() {
    if (!title.trim()) {
      toast("Please enter a task title", "error");
      return;
    }

    const plannedSeconds = convertHoursToSeconds(estimatedHours);
    const checklistItems = parseChecklist(checklistText);

    try {
      const trimmed = title.trim().slice(0, 128);
      const created = await createTask({
        sprintId: selectedSprintId,
        title: trimmed,
      });
      const resolvedSprintId = created.sprintId ?? selectedSprintId;
      const resolvedEpicId =
        sprints.find((sp) => sp.id === resolvedSprintId)?.epicId ?? undefined;

      storeAddTask({
        epicId: resolvedEpicId,
        ...created,
      } as any);

      // create checklists via API and add to store
      for (const item of checklistItems) {
        try {
          const c = await createChecklistForTask(created.id, item.title);
          storeAddChecklist(c);
        } catch (err) {
          console.error("failed creating checklist", err);
        }
      }

      toast("Task created", "success");
      onClose();
    } catch (err) {
      console.error(err);
      toast("Failed to create task", "error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Add New Task</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-5 space-y-6">
          {/* Task Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Task Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title..."
              maxLength={128}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Estimated */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Estimated Time (hours)
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="e.g. 4"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Sprint (when modal is opened with a sprintId we hide the dropdown) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Assign to Sprint
            </label>
            {sprintId ? (
              <div className="mt-2 text-sm text-slate-700">
                {sprintsById[selectedSprintId]?.name ?? "Sprint"}
              </div>
            ) : (
              <select
                value={selectedSprintId}
                onChange={(e) => setSelectedSprintId(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none"
              >
                {sprints.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Checklist */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Checklist (Optional)
            </label>

            <textarea
              rows={4}
              value={checklistText}
              onChange={(e) => setChecklistText(e.target.value)}
              placeholder={`Define sprint scope\nReview API structure`}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />

            <p className="mt-1 text-xs text-slate-400">
              Add one checklist item per line
            </p>
          </div>

          {/* Info Box */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-600">
              Estimated time cannot be edited after creation.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>

          <button
            onClick={onSaveChanges}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
