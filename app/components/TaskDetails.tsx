"use client";

import React, { useEffect, useMemo, useState } from "react";

type TaskStatus = "todo" | "running" | "completed";

type Props = {
  name: string;
  status: TaskStatus;
  totalSeconds: number;
  estimatedSeconds?: number;
  checklistTotal: number;
  checklistCompleted: number;
  onRename?: (newName: string) => void;
  /**
   * Optional editable hours (decimal). If provided, the component will render
   * a number input and call `onEstimatedHoursChange` whenever the user changes it.
   */
  estimatedHours?: number;
  onEstimatedHoursChange?: (hours: number) => void;
};

function formatHMS(totalSeconds: number) {
  const sec = totalSeconds % 60;
  const min = Math.floor((totalSeconds / 60) % 60);
  const hrs = Math.floor(totalSeconds / 3600);
  return [hrs, min, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function TaskDetails({
  name,
  status,
  totalSeconds,
  estimatedSeconds,
  estimatedHours,
  onEstimatedHoursChange,
  checklistTotal,
  checklistCompleted,
  onRename,
}: Props) {
  const [value, setValue] = useState(name);
  const [hoursValue, setHoursValue] = useState<string>(
    typeof estimatedHours === "number" ? String(estimatedHours) : "",
  );

  // keep local value in sync when name prop changes
  useEffect(() => {
    setValue(name);
  }, [name]);

  // debounce onRename as the user types
  useEffect(() => {
    const trimmed = value.trim();
    if (!onRename) return;
    // if same as incoming name, skip
    if (trimmed === name) return;
    const id = setTimeout(() => {
      if (!trimmed) return;
      onRename(trimmed);
    }, 700);
    return () => clearTimeout(id);
  }, [value, onRename, name]);

  // editable estimated hours debounce
  useEffect(() => {
    if (!onEstimatedHoursChange) return;
    if (hoursValue === "") return;
    const n = Number(hoursValue);
    if (isNaN(n)) return;
    // if same as incoming estimatedHours, skip
    if (typeof estimatedHours === "number" && Math.abs(estimatedHours - n) < 1e-6) return;
    const id = setTimeout(() => {
      onEstimatedHoursChange(n);
    }, 700);
    return () => clearTimeout(id);
  }, [hoursValue, onEstimatedHoursChange, estimatedHours]);

  const badge = useMemo(() => {
    switch (status) {
      case "running":
        return {
          label: "In Progress",
          className: "bg-yellow-100 text-yellow-700",
        };
      case "completed":
        return {
          label: "Completed",
          className: "bg-green-100 text-green-700",
        };
      default:
        return {
          label: "To Do",
          className: "bg-gray-100 text-gray-700",
        };
    }
  }, [status]);

  function handleRename() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) return;
    onRename?.(trimmed);
  }

  return (
    <div className="space-y-6">
      {/* Task Name */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Task Name
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={128}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") setValue(name);
          }}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Meta Summary */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        {/* Status */}
        <div>
          <span className="text-slate-500">Status</span>
          <div
            className={`mt-1 inline-block rounded-full px-2 py-0.5 font-medium ${badge.className}`}
          >
            {badge.label}
          </div>
        </div>

        {/* Total Time */}
        <div>
          <span className="text-slate-500">Total Time</span>
          <div className="mt-1 font-mono text-sm font-semibold text-slate-900">
            {formatHMS(totalSeconds)}
          </div>
        </div>

            {/* Estimated (editable hours when handler provided) */}
            <div>
              <span className="text-slate-500">Estimated</span>
              <div className="mt-1">
                {onEstimatedHoursChange ? (
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.25"
                    min="0"
                    value={hoursValue}
                    onChange={(e) => setHoursValue(e.target.value)}
                    onBlur={() => {
                      const n = Number(hoursValue);
                      if (!isNaN(n)) onEstimatedHoursChange(n);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const n = Number(hoursValue);
                        if (!isNaN(n)) onEstimatedHoursChange(n);
                      }
                      if (e.key === "Escape") setHoursValue(typeof estimatedHours === "number" ? String(estimatedHours) : "");
                    }}
                    className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                ) : (
                  <div className="text-slate-800">
                    {estimatedSeconds ? formatHMS(estimatedSeconds) : "—"}
                  </div>
                )}
              </div>
            </div>

        {/* Checklist */}
        <div>
          <span className="text-slate-500">Checklist</span>
          <div className="mt-1 text-emerald-600 font-medium">
            {checklistCompleted} / {checklistTotal} completed
          </div>
        </div>
      </div>
    </div>
  );
}
