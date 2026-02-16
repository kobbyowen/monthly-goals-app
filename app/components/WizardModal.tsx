"use client";

import React, { useState } from "react";
import WizardStep1 from "./WizardStep1";
import WizardStep2 from "./WizardStep2";
import WizardStep3 from "./WizardStep3";
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
  const [step1Data, setStep1Data] = useState({
    month: epicMonth || "",
    includeWeekends: false,
    weeklyCommitment: 0,
  });

  const [step2Data, setStep2Data] = useState({
    numSprints: 4,
    weeksPerSprint: 1,
    startDate: "",
    goals: [],
  });

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
    const month = step1Data.month || epicMonth;
    if (!month || !month.trim()) {
      toast("Please select a month", "error");
      return false;
    }
    if (!step1Data.weeklyCommitment || step1Data.weeklyCommitment <= 0) {
      toast("Please set a weekly commitment (> 0)", "error");
      return false;
    }
    return true;
  }

  function formatDate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function generateSprintsFromStep2() {
    const num = Math.max(1, Number(step2Data.numSprints || 4));
    const weeks = Math.max(1, Number(step2Data.weeksPerSprint || 1));
    const start = step2Data.startDate
      ? new Date(step2Data.startDate)
      : new Date();
    const arr: SprintRow[] = [];
    for (let i = 0; i < num; i++) {
      const s = new Date(start);
      s.setDate(start.getDate() + i * weeks * 7);
      const e = new Date(s);
      e.setDate(s.getDate() + weeks * 7 - 1);
      arr.push({
        id: `spr_${Date.now()}_${i}`,
        name: `Sprint ${i + 1}`,
        startAt: formatDate(s),
        endAt: formatDate(e),
        tasks: [],
      });
    }
    setSprints(arr);
  }

  function daysInMonthFromKey(key?: string) {
    try {
      if (!key) return new Date().getDate();
      const [y, m] = key.split("-").map((s) => Number(s));
      if (!y || !m) return new Date().getDate();
      return new Date(y, m, 0).getDate();
    } catch {
      return new Date().getDate();
    }
  }

  function usedWeeklyFromGoals(goals: any[] = []) {
    const days = daysInMonthFromKey(step1Data.month || epicMonth);
    return goals.reduce((acc, g) => {
      if (!g) return acc;
      if (g.effortType === "monthly") {
        // monthly -> weekly = monthly * 7 / days
        return acc + (Number(g.hours) * 7) / days;
      }
      return acc + Number(g.hours || 0);
    }, 0);
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
  const _goals = step2Data.goals || [];
  const _usedWeekly = usedWeeklyFromGoals(_goals);
  const _weeklyLimit = step1Data.weeklyCommitment || 0;

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
          <div className="mb-3">
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {step === 1
                ? "Plan Your Monthly Capacity"
                : step === 2
                  ? "Plan Sprints & Tasks"
                  : "Review & Create Epic"}
            </h2>
          </div>
          {step === 1 && (
            <WizardStep1
              data={{
                month: step1Data.month || epicMonth,
                includeWeekends: step1Data.includeWeekends,
                weeklyCommitment: step1Data.weeklyCommitment,
              }}
              onChange={(patch) => {
                const next = { ...step1Data, ...patch };
                setStep1Data(next);
                if (patch.month) setEpicMonth(patch.month);
              }}
              onNext={() => {
                setEpicMonth(step1Data.month || epicMonth);
                setStep(2);
              }}
              onCancel={onClose}
            />
          )}

          {step === 2 && (
            <WizardStep2
              data={{
                numSprints: step2Data.numSprints,
                weeksPerSprint: step2Data.weeksPerSprint,
                startDate: step2Data.startDate,
              }}
              weeklyLimit={step1Data.weeklyCommitment}
              epicMonth={epicMonth}
              onChange={(patch) => setStep2Data((s) => ({ ...s, ...patch }))}
            />
          )}

          {step === 3 && (
            <WizardStep3
              data={{
                epicId,
                epicName,
                epicMonth,
                sprints,
                step2: step2Data,
                step1: step1Data,
              }}
            />
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
                  if (step === 1) {
                    const month = step1Data.month || epicMonth;
                    if (!month || !month.trim()) {
                      toast("Please select a month", "error");
                      return;
                    }
                    if (
                      !step1Data.weeklyCommitment ||
                      step1Data.weeklyCommitment <= 0
                    ) {
                      toast("Please set a weekly commitment (> 0)", "error");
                      return;
                    }
                    setEpicMonth(month);
                    setStep((s) => s + 1);
                    return;
                  }

                  // step === 2: validate goals allocation before proceeding
                  const goals = step2Data.goals || [];
                  const used = usedWeeklyFromGoals(goals);
                  const limit = step1Data.weeklyCommitment || 0;
                  if (limit > 0 && used > limit) {
                    toast("Goals exceed weekly commitment", "error");
                    return;
                  }
                  // if user hasn't created sprints, generate from step2Data
                  if (sprints.length === 0) {
                    generateSprintsFromStep2();
                  }
                  if (validateStep2()) setStep((s) => s + 1);
                }}
                disabled={
                  step === 2 && _weeklyLimit > 0 && _usedWeekly > _weeklyLimit
                }
                className={`rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white ${
                  step === 2 && _weeklyLimit > 0 && _usedWeekly > _weeklyLimit
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                title={
                  step === 2 && _weeklyLimit > 0 && _usedWeekly > _weeklyLimit
                    ? "Reduce goal allocation to proceed"
                    : undefined
                }
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
