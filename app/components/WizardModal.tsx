"use client";

import React, { useState } from "react";
import { createPlan } from "@lib/api/wizard";
import { toast } from "../lib/ui";

type TaskRow = {
  id: string;
  name: string;
  effortType: string;
  allocatedHours: number;
  priority: string;
};

type SprintRow = {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  tasks: TaskRow[];
};

export default function WizardModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (epic: any) => void;
}) {
  const [step, setStep] = useState(1);

  const [epicId, setEpicId] = useState("");
  const [epicName, setEpicName] = useState("");
  const [epicMonth, setEpicMonth] = useState("");

  const [sprints, setSprints] = useState<SprintRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function addSprint() {
    setSprints((s) => [
      ...s,
      {
        id: `spr_${Date.now()}`,
        name: "New Sprint",
        startAt: "",
        endAt: "",
        tasks: [],
      },
    ]);
  }

  function removeSprint(idx: number) {
    setSprints((s) => s.filter((_, i) => i !== idx));
  }

  function updateSprint(idx: number, patch: Partial<SprintRow>) {
    setSprints((s) => s.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addTaskToSprint(sprintIdx: number) {
    setSprints((s) =>
      s.map((r, i) =>
        i === sprintIdx
          ? {
              ...r,
              tasks: [
                ...r.tasks,
                {
                  id: `task_${Date.now()}`,
                  name: "New Task",
                  effortType: "weekly",
                  allocatedHours: 1,
                  priority: "medium",
                },
              ],
            }
          : r,
      ),
    );
  }

  function updateTask(
    sprintIdx: number,
    taskIdx: number,
    patch: Partial<TaskRow>,
  ) {
    setSprints((s) =>
      s.map((r, i) =>
        i === sprintIdx
          ? {
              ...r,
              tasks: r.tasks.map((t, ti) =>
                ti === taskIdx ? { ...t, ...patch } : t,
              ),
            }
          : r,
      ),
    );
  }

  function removeTask(sprintIdx: number, taskIdx: number) {
    setSprints((s) =>
      s.map((r, i) =>
        i === sprintIdx
          ? { ...r, tasks: r.tasks.filter((_, ti) => ti !== taskIdx) }
          : r,
      ),
    );
  }

  function validateStep1() {
    if (!epicId.trim() || !epicName.trim() || !epicMonth.trim()) {
      toast("Please fill epic id, name and month", "error");
      return false;
    }
    return true;
  }

  function validateStep2() {
    if (sprints.length === 0) {
      toast("Add at least one sprint", "error");
      return false;
    }
    for (const sp of sprints) {
      if (!sp.id || !sp.name || !sp.startAt || !sp.endAt) {
        toast("Each sprint needs id, name, startAt and endAt", "error");
        return false;
      }
    }
    return true;
  }

  async function handleSubmit() {
    if (!validateStep1()) return setStep(1);
    if (!validateStep2()) return setStep(2);
    const payload = {
      epicId,
      epicName,
      epicMonth,
      sprints: sprints.map((sp) => ({
        id: sp.id,
        name: sp.name,
        startAt: sp.startAt,
        endAt: sp.endAt,
        tasks: sp.tasks.map((t) => ({
          id: t.id,
          name: t.name,
          effortType: t.effortType,
          allocatedHours: t.allocatedHours,
          priority: t.priority,
        })),
      })),
    };

    setSubmitting(true);
    try {
      const created = await createPlan(payload as any);
      toast("Epic created", "success");
      if (onCreated) onCreated(created);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast(`Create failed: ${err?.message ?? String(err)}`, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white flex flex-col max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Create Epic From Goals — Step {step} of 3
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  Epic ID
                </label>
                <input
                  value={epicId}
                  onChange={(e) => setEpicId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  Epic Name
                </label>
                <input
                  value={epicName}
                  onChange={(e) => setEpicName(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  Epic Month (YYYY-MM)
                </label>
                <input
                  value={epicMonth}
                  onChange={(e) => setEpicMonth(e.target.value)}
                  placeholder="2026-01"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Sprints</div>
                <div>
                  <button
                    onClick={addSprint}
                    className="rounded bg-emerald-600 text-white px-3 py-1 text-sm"
                  >
                    Add Sprint
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {sprints.map((sp, si) => (
                  <div key={sp.id} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        value={sp.name}
                        onChange={(e) =>
                          updateSprint(si, { name: e.target.value })
                        }
                        className="rounded-md border px-2 py-1 text-sm mr-2"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeSprint(si)}
                          className="text-rose-500 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        value={sp.startAt}
                        onChange={(e) =>
                          updateSprint(si, { startAt: e.target.value })
                        }
                        placeholder="2026-01-01"
                        className="rounded-md border px-2 py-1 text-sm"
                      />
                      <input
                        value={sp.endAt}
                        onChange={(e) =>
                          updateSprint(si, { endAt: e.target.value })
                        }
                        placeholder="2026-01-07"
                        className="rounded-md border px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Tasks</div>
                        <button
                          onClick={() => addTaskToSprint(si)}
                          className="rounded bg-slate-200 px-2 py-1 text-sm"
                        >
                          Add Task
                        </button>
                      </div>
                      <div className="space-y-2">
                        {sp.tasks.map((t, ti) => (
                          <div
                            key={t.id}
                            className="grid grid-cols-4 gap-2 items-center"
                          >
                            <input
                              value={t.name}
                              onChange={(e) =>
                                updateTask(si, ti, { name: e.target.value })
                              }
                              className="col-span-1 rounded-md border px-2 py-1 text-sm"
                            />
                            <input
                              value={String(t.allocatedHours)}
                              onChange={(e) =>
                                updateTask(si, ti, {
                                  allocatedHours: Number(e.target.value) || 0,
                                })
                              }
                              className="rounded-md border px-2 py-1 text-sm"
                            />
                            <select
                              value={t.priority}
                              onChange={(e) =>
                                updateTask(si, ti, { priority: e.target.value })
                              }
                              className="rounded-md border px-2 py-1 text-sm"
                            >
                              <option value="high">high</option>
                              <option value="medium">medium</option>
                              <option value="low">low</option>
                            </select>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => removeTask(si, ti)}
                                className="text-rose-500 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-slate-500">Epic ID</div>
                <div className="font-medium">{epicId}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Epic Name</div>
                <div className="font-medium">{epicName}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Epic Month</div>
                <div className="font-medium">{epicMonth}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Sprints Preview</div>
                <div className="space-y-2 mt-2">
                  {sprints.map((sp) => (
                    <div key={sp.id} className="p-2 border rounded">
                      <div className="font-medium">
                        {sp.name} ({sp.startAt} → {sp.endAt})
                      </div>
                      <ul className="ml-4 list-disc mt-1 text-sm">
                        {sp.tasks.map((t) => (
                          <li key={t.id}>
                            {t.name} — {t.allocatedHours}h — {t.priority}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 border-t border-slate-200 px-5 py-3">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-md bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step < 3 && (
              <button
                onClick={() => {
                  if (step === 1 ? validateStep1() : validateStep2())
                    setStep((s) => s + 1);
                }}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Next
              </button>
            )}
            {step === 3 && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {submitting ? "Creating..." : "Create Epic"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
