"use client";

import React, { useMemo, useState } from "react";
import { useRootEpicStore } from "../stores";
import { useShallow } from "zustand/shallow";
import AddSprintModal from "./AddSprintModal";

export default function EpicHeader({ epicId }: { epicId: string }) {
  const [epic, sprintView, getTasksByEpic] = useRootEpicStore(
    useShallow((s) => [
      s.epics.byId[epicId],
      s.getSprintsByEpic(epicId),
      s.getTasksByEpic,
    ]),
  );

  const tasks = useMemo(
    () => getTasksByEpic(epicId) || [],
    [getTasksByEpic, epicId],
  );
  const total = tasks.length || 0;
  const completed = tasks.filter((t) => t.completed).length || 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const sprintCount = (sprintView || []).length;
  const taskCount =
    (epic?.taskIds?.length || 0) +
    (sprintView || []).reduce((acc, s) => acc + (s.taskIds?.length || 0), 0);

  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="max-w-6xl mx-0 p-0 md:p-4 mb-8 md:mb-4">
        <section className="bg-transparent rounded-none p-0 md:p-6 space-y-4 md:pb-0 md:space-y-6 border-b border-border">
          <div className="flex flex-col items-center md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
            {/* Left */}
            <div className="space-y-2 text-center md:text-left">
              <h1 className="text-2xl font-semibold text-foreground">
                {epic?.name}
              </h1>

              <p className="text-sm text-muted-foreground max-w-xl">
                {epic?.description ?? ""}
              </p>
            </div>

            {/* Right Stats */}
            <div className="flex items-center gap-8 md:gap-6 text-sm text-muted-foreground w-full md:w-auto justify-center md:justify-end">
              <div className="text-center">
                <p className="font-semibold text-foreground">{sprintCount}</p>
                <p className="text-xs text-muted-foreground">Sprints</p>
              </div>

              <div className="text-center">
                <p className="font-semibold text-foreground">{taskCount}</p>
                <p className="text-xs text-muted-foreground">Tasks</p>
              </div>

              <div className="text-center">
                <p
                  className={`text-sm font-semibold ${pct === 100 ? "text-green-600" : pct === 0 ? "text-gray-400" : "text-indigo-600"}`}
                >
                  {pct}%
                </p>
                <p className="text-xs text-muted-foreground">Progress</p>
              </div>

              <button
                onClick={() => setOpen(true)}
                className="hidden md:inline-flex px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Add Sprint
              </button>
            </div>
          </div>

          {/* Mobile actions row: show buttons stacked below on small screens */}
          <div className="md:hidden mt-2">
            <button
              onClick={() => setOpen(true)}
              className="w-full px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Add Sprint
            </button>
          </div>
          {/* removed overall progress bar to match SprintList */}
        </section>
      </div>

      {open && (
        <AddSprintModal
          epicId={epicId}
          onClose={() => setOpen(false)}
          onCreated={() => setOpen(false)}
        />
      )}
    </>
  );
}
