"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createEpic } from "@lib/api/epics";
import { toast } from "../lib/ui";
import { useRootEpicStore } from "../stores";
import { useShallow } from "zustand/shallow";
import { weeksInMonth } from "../utils/date";
import { withBase } from "../lib/api";

export default function AddEpicModal({
  onCreated,
  onClose,
}: {
  onCreated?: (epic: any) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [addEpicToStore, addSprintToStore] = useRootEpicStore(
    useShallow((s) => [s.addEpic, s.addSprint]),
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const monthOptions = Array.from({ length: 12 }).map((_, idx) => {
    const month = idx + 1;
    const date = new Date(currentYear, idx, 1);
    const label = date.toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
    const key = `${currentYear}-${String(month).padStart(2, "0")}`;
    return { key, label, year: currentYear, month };
  });

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    const now = new Date();
    const key = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return monthOptions.find((m) => m.key === key)?.key || monthOptions[0]?.key;
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sprintNames, setSprintNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // derive default sprint count from selected month
    const meta = monthOptions.find((m) => m.key === selectedMonthKey);
    const y = meta?.year || currentYear;
    const m = meta?.month || 1;
    try {
      const w = weeksInMonth(y, m);
      setSprintNames(Array.from({ length: w }).map((_, i) => `Week ${i + 1}`));
    } catch (e) {
      setSprintNames(["Week 1", "Week 2", "Week 3", "Week 4"]);
    }
  }, [selectedMonthKey]);

  useEffect(() => {
    // prefills name when opened
    const meta = monthOptions.find((m) => m.key === selectedMonthKey);
    const monthName = new Date(
      meta?.year || currentYear,
      (meta?.month || 1) - 1,
      1,
    ).toLocaleString(undefined, { month: "long" });
    setName(`${monthName} Epic`);
  }, [selectedMonthKey]);

  async function handleCreate() {
    if (!name.trim()) {
      toast("Please enter an epic name", "error");
      return;
    }
    setLoading(true);
    try {
      const meta = monthOptions.find((m) => m.key === selectedMonthKey);
      const epicYear = meta?.year;
      const epicMonth = meta?.month;
      const sprints = sprintNames.map((sn, idx) => ({
        name: sn,
        weekOfMonth: idx + 1,
      }));
      const payload: any = {
        name: name.trim(),
        description: description.trim(),
        sprints,
      };
      if (epicYear && epicMonth) {
        payload.epicYear = epicYear;
        payload.epicMonth = epicMonth;
      }

      const created = await createEpic(payload as any);

      try {
        // Update local store if available
        addEpicToStore(created as any);
        if (created.sprints && Array.isArray(created.sprints)) {
          created.sprints.forEach((sp: any) => addSprintToStore(sp));
        }
      } catch (e) {
        // ignore store update errors
      }

      if (onCreated) onCreated(created);
      onClose();
      // navigate to epic page
      router.push(withBase(`/epics/${created.id}`));
    } catch (err) {
      console.error("Create epic failed:", err);
      toast(
        `Could not create epic: ${err instanceof Error ? err.message : String(err)}`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            New Monthly Epic
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-5 space-y-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Epic Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="January Growth Epic"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Description / Motto
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description or motto"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Month
            </label>
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sprints (Weeks)
              </h3>
              <button
                onClick={() =>
                  setSprintNames((prev) => [...prev, `Week ${prev.length + 1}`])
                }
                className="text-xs font-medium text-emerald-600 hover:underline"
                type="button"
              >
                + Add Sprint
              </button>
            </div>

            <div className="space-y-2">
              {sprintNames.map((sn, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sn}
                    onChange={(e) => {
                      const copy = [...sprintNames];
                      copy[idx] = e.target.value;
                      setSprintNames(copy);
                    }}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    onClick={() =>
                      setSprintNames((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-rose-500 text-sm hover:text-rose-600"
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              Weeks are auto-generated based on the selected month.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {loading ? "Creating..." : "Create Epic"}
          </button>
        </div>
      </div>
    </div>
  );
}
