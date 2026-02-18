"use client";

import React from "react";
import { useState, useMemo } from "react";
import { useRootEpicStore } from "../stores";
import { useShallow } from "zustand/shallow";
import { createSprint } from "@api/sprints";

function formatShort(d: Date) {
  return d.toLocaleString(undefined, { month: "short", day: "numeric" });
}

function getWeeksInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // find the Monday on or before the first day
  const start = new Date(firstDay);
  while (start.getDay() !== 1) {
    start.setDate(start.getDate() - 1);
  }

  const weeks: { start: Date; end: Date }[] = [];
  let cur = new Date(start);
  while (cur <= lastDay) {
    const ws = new Date(cur);
    const we = new Date(cur);
    we.setDate(we.getDate() + 6);
    // include weeks whose Monday (ws) starts inside the month
    if (ws.getMonth() === month) {
      weeks.push({ start: new Date(ws), end: new Date(we) });
    }
    cur.setDate(cur.getDate() + 7);
  }

  return weeks;
}

export default function AddSprintModal({
  epicId,
  onClose,
  onCreated,
  initialDate,
}: {
  epicId: string;
  onClose: () => void;
  onCreated?: (sprint: any) => void;
  initialDate?: Date;
}) {
  const now = React.useMemo(() => initialDate ?? new Date(), [initialDate]);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  const [epicsById, storeAddSprint, storeUpdateEpic] = useRootEpicStore(
    useShallow((s) => [s.epics.byId, s.addSprint, s.updateEpic]),
  );

  const epic = epicsById?.[epicId];

  const weeks = useMemo(() => {
    const y =
      typeof epic?.epicYear === "number" ? epic.epicYear : now.getFullYear();
    const m =
      typeof epic?.epicMonth === "number" ? epic.epicMonth - 1 : now.getMonth();
    return getWeeksInMonth(y, m);
  }, [epic?.epicYear, epic?.epicMonth, now]);

  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  // pick a sensible default week when weeks change: prefer current week if inside range,
  // otherwise default to second week when available, else first.
  React.useEffect(() => {
    const today = new Date();
    // prefer the week that contains today (if in same month), otherwise prefer week 1
    const found = weeks.findIndex((w) => today >= w.start && today <= w.end);
    if (found !== -1) {
      setSelectedWeekIndex(found);
      return;
    }
    // default to first week of epic month
    setSelectedWeekIndex(0);
  }, [weeks]);

  const selectedRange = weeks[selectedWeekIndex];

  async function handleCreate() {
    try {
      const sprintName = (name || `Week ${selectedWeekIndex + 1} Sprint`).slice(
        0,
        255,
      );
      const payload: any = { name: sprintName, epicId };
      if (selectedRange) {
        payload.label = `${selectedRange.start.toISOString().slice(0, 10)}_${selectedRange.end.toISOString().slice(0, 10)}`;
        payload.start = selectedRange.start.toISOString();
        payload.end = selectedRange.end.toISOString();
        payload.weekOfMonth = selectedWeekIndex + 1;
      }
      const created = await createSprint(payload);

      try {
        storeAddSprint(created as any);
        const epic = epicsById[epicId];
        const nextIds = epic
          ? [...(epic.sprintIds || []), created.id]
          : [created.id];
        storeUpdateEpic(epicId, { sprintIds: nextIds });
      } catch (err) {
        console.error("failed updating store after creating sprint", err);
      }

      if (onCreated) onCreated(created);
      onClose();
    } catch (err) {
      console.error(err);
    }
  }

  // no month/year selects: month is derived from epic metadata

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card text-card-foreground flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Add Sprint</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:opacity-80"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Sprint Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              placeholder="Week 2 Sprint"
              className="w-full rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Week of Month
            </label>

            <select
              value={selectedWeekIndex}
              onChange={(e) => setSelectedWeekIndex(Number(e.target.value))}
              className="mt-2 w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            >
              {weeks.map((w, idx) => (
                <option key={idx} value={idx}>
                  {`Week ${idx + 1}`}
                </option>
              ))}
            </select>

            {selectedRange && (
              <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <span className="font-medium">{`Week ${selectedWeekIndex + 1}: `}</span>
                {`${formatShort(selectedRange.start)} – ${formatShort(selectedRange.end)}`}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Sprint Goal (optional)
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={3}
              placeholder="What should this sprint achieve?"
              className="w-full rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <p className="text-[11px] text-muted-foreground">
            Tasks can be added after creating the sprint.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md bg-muted px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Create Sprint
          </button>
        </div>
      </div>
    </div>
  );
}
