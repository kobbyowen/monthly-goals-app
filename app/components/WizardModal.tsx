"use client";

import React, { useState } from "react";
import WizardStep0 from "./WizardStep0";
import WizardStep1 from "./WizardStep1";
import WizardStep2 from "./WizardStep2";
import WizardStep3 from "./WizardStep3";
import { toast } from "../lib/ui";
import { submitGoalsForEpic } from "@lib/api/submitGoalsForEpic";
import useRootEpicStore from "../stores/rootEpicStore";

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
  const [step, setStep] = useState(0);

  const [epicId, setEpicId] = useState("");
  const [epicName, setEpicName] = useState("");
  const [epicDescription, setEpicDescription] = useState(
    "Hard work beats talent",
  );
  const [epicMonth, setEpicMonth] = useState("");
  const [epicNameAuto, setEpicNameAuto] = useState(true);
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
  const [isDirty, setIsDirty] = useState(false);
  const addEpicsFromApi = useRootEpicStore((s) => s.addEpicsFromApi);
  const epicById = useRootEpicStore((s) => s.epics.byId);

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
    setIsDirty(true);
  }

  function removeSprint(idx: number) {
    setSprints((s) => s.filter((_, i) => i !== idx));
    setIsDirty(true);
  }

  function updateSprint(idx: number, patch: Partial<SprintRow>) {
    setSprints((s) => s.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    setIsDirty(true);
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
    setIsDirty(true);
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
    setIsDirty(true);
  }

  function resetWizardState() {
    setEpicId("");
    setEpicName("");
    setEpicDescription("");
    setEpicMonth("");
    setStep1Data({ month: "", includeWeekends: false, weeklyCommitment: 0 });
    setStep2Data({
      numSprints: 4,
      weeksPerSprint: 1,
      startDate: "",
      goals: [],
    });
    setSprints([]);
    setEpicNameAuto(true);
    setIsDirty(false);
    setStep(0);
    setSubmitting(false);
  }

  function handleCloseAttempt() {
    if (!isDirty) {
      resetWizardState();
      onClose();
      return;
    }
    // warn user that unsaved changes will be lost
    // eslint-disable-next-line no-restricted-globals
    const ok = confirm(
      "You have unsaved changes — closing will discard them. Proceed?",
    );
    if (ok) {
      resetWizardState();
      onClose();
    }
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
    return arr;
  }

  function daysInMonthFromKey(key?: string) {
    try {
      if (!key) return new Date().getDate();
      const [y, m] = key.split("-").map((s) => Number(s));
      if (!y || !m) return new Date().getDate();
      const total = new Date(y, m, 0).getDate();
      // if the key is the current month, exclude past days
      const now = new Date();
      if (now.getFullYear() === y && now.getMonth() + 1 === m) {
        return Math.max(0, total - (now.getDate() - 1));
      }
      return total;
    } catch {
      return new Date().getDate();
    }
  }

  function countWeekendDaysFromKey(key?: string) {
    try {
      if (!key) return 0;
      const [y, m] = key.split("-").map((s) => Number(s));
      if (!y || !m) return 0;
      const total = new Date(y, m, 0).getDate();
      const now = new Date();
      const fromDay =
        now.getFullYear() === y && now.getMonth() + 1 === m ? now.getDate() : 1;
      let count = 0;
      for (let d = fromDay; d <= total; d++) {
        const dow = new Date(y, m - 1, d).getDay();
        if (dow === 0 || dow === 6) count++;
      }
      return count;
    } catch {
      return 0;
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

  function validateStep2(sprintsList?: SprintRow[]) {
    const list = sprintsList || sprints;
    if (!list || list.length === 0) {
      toast("Add at least one sprint", "error");
      return false;
    }
    for (const sp of list) {
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

    // build structured plan JSON per spec
    function buildPlan() {
      const monthKey = epicMonth || step1Data.month;
      const [py, pm] = (monthKey || "").split("-").map((s) => Number(s));
      const daysInMonth = daysInMonthFromKey(monthKey);
      const weekendDays = countWeekendDaysFromKey(monthKey);
      const fullWeeks = Math.floor(daysInMonth / 7);
      const remainderDays = daysInMonth % 7;
      const weeksInMonth = fullWeeks + (remainderDays > 0 ? 1 : 0);

      const totalHoursInMonth = daysInMonth * 24;
      const totalHoursExcludingWeekends = totalHoursInMonth - weekendDays * 24;
      const sleepHoursPerDay = 8;
      const includedDays = step1Data.includeWeekends
        ? daysInMonth
        : daysInMonth - weekendDays;
      const safeHoursPerDay = 6; // internal
      const safeCommitmentHours = Math.max(0, safeHoursPerDay * includedDays);

      const weeklyCommitmentHours = Number(step1Data.weeklyCommitment || 0);
      const dailyCommitment = weeklyCommitmentHours / 7;
      const monthlyCommitmentHours =
        Math.round(
          (fullWeeks * weeklyCommitmentHours +
            remainderDays * dailyCommitment) *
            100,
        ) / 100;

      const goals = (step2Data.goals || []).map((g: any, idx: number) => {
        const hours = Number(g.hours || 0);
        const effortFrequency = g.effortType || "weekly";
        const monthlyEquivalentHours =
          effortFrequency === "monthly" ? hours : hours * 4;
        return {
          id: g.id || `goal_${Date.now()}_${idx}`,
          name: g.name,
          priority: (g.priority || "medium").toLowerCase(),
          effort: {
            hours: hours,
            effortFrequency: effortFrequency,
            monthlyEquivalentHours: monthlyEquivalentHours,
          },
        };
      });

      const monthlyAllocatedHours = goals.reduce(
        (s: number, gg: any) => s + (gg.effort.monthlyEquivalentHours || 0),
        0,
      );
      const monthlyRemainingHours = Math.max(
        0,
        monthlyCommitmentHours - monthlyAllocatedHours,
      );
      const isOverAllocated = monthlyAllocatedHours > monthlyCommitmentHours;

      // generate sprints aligned to weeks: first week starts on month first day, ends on Sunday, then Monday-Sunday until month end
      const sprintsPreview: any[] = [];
      if (py && pm) {
        const first = new Date(py, pm - 1, 1);
        const last = new Date(py, pm, 0);
        // first end Sunday
        const firstStart = new Date(first);
        const daysUntilSunday = (7 - firstStart.getDay()) % 7;
        const firstEnd = new Date(firstStart);
        firstEnd.setDate(firstStart.getDate() + daysUntilSunday);
        if (firstEnd > last) firstEnd.setTime(last.getTime());
        sprintsPreview.push({
          name: "Week 1",
          weekNumber: 1,
          startDate: formatDate(firstStart),
          endDate: formatDate(firstEnd),
        });

        let nextStart = new Date(firstEnd);
        nextStart.setDate(firstEnd.getDate() + 1);
        let wn = 2;
        while (nextStart <= last) {
          const weekStart = new Date(nextStart);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          if (weekEnd > last) weekEnd.setTime(last.getTime());
          sprintsPreview.push({
            name: `Week ${wn}`,
            weekNumber: wn,
            startDate: formatDate(weekStart),
            endDate: formatDate(weekEnd),
          });
          wn++;
          nextStart = new Date(weekEnd);
          nextStart.setDate(weekEnd.getDate() + 1);
        }
      }

      // filter out very short weeks:
      // - if weekends are included: remove weeks with less than 2 calendar days
      // - if weekends are excluded: remove weeks with less than 2 working days (Mon-Fri)
      const includeWeekends = !!step1Data.includeWeekends;
      function daysInclusive(a: Date, b: Date) {
        return (
          Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1
        );
      }
      function workingDaysInclusive(a: Date, b: Date) {
        let cnt = 0;
        for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
          const dow = d.getDay();
          if (dow !== 0 && dow !== 6) cnt++;
        }
        return cnt;
      }

      const filteredPreview = sprintsPreview.filter((sp) => {
        const s = new Date(sp.startDate);
        const e = new Date(sp.endDate);
        const totalDays = daysInclusive(s, e);
        if (includeWeekends) return totalDays >= 2;
        const workDays = workingDaysInclusive(s, e);
        return workDays >= 2;
      });

      // compute hours for each sprint based on weekly commitment and days in the week
      let globalSeq = 0;
      const sprintsWithHours = filteredPreview.map((sp) => {
        const s = new Date(sp.startDate);
        const e = new Date(sp.endDate);
        const daysCount = includeWeekends
          ? daysInclusive(s, e)
          : workingDaysInclusive(s, e);
        // If this is a full week allocate full weekly commitment regardless
        // of whether weekends are included. For partial weeks, allocate
        // proportionally using a 7-day denominator so fractions are consistent.
        let weekHours: number;
        const isFullWeek = includeWeekends ? daysCount === 7 : daysCount === 5;
        if (isFullWeek) {
          weekHours = weeklyCommitmentHours;
        } else {
          weekHours = Math.round((weeklyCommitmentHours / 7) * daysCount);
        }
        const wn = Number(sp.weekNumber) || 0;
        // global sequence across active (filtered) sprints
        globalSeq++;
        const seq = String(globalSeq).padStart(2, "0");
        const name = `Week ${wn} Sprint ${seq}`;
        return { ...sp, name, hours: weekHours };
      });

      // Post-process: ensure total month hours >= weeklyCommitmentHours * 4
      try {
        const totalMonthHours = sprintsWithHours.reduce(
          (acc, s) => acc + (s.hours || 0),
          0,
        );
        const minMonthlyRequired = (weeklyCommitmentHours || 0) * 4;
        if (
          totalMonthHours < minMonthlyRequired &&
          sprintsWithHours.length > 0
        ) {
          const diff = Math.round(minMonthlyRequired - totalMonthHours);
          sprintsWithHours[sprintsWithHours.length - 1].hours =
            (sprintsWithHours[sprintsWithHours.length - 1].hours || 0) + diff;
        }
      } catch (e) {
        // best-effort; do not break plan generation
      }

      const plan = {
        wizardVersion: 2,
        capacity: {
          month: {
            year: py || null,
            month: pm || null,
            label: monthKey || null,
            daysInMonth,
            weeksInMonth,
          },
          includeWeekends: !!step1Data.includeWeekends,
          hours: {
            totalHoursInMonth,
            totalHoursExcludingWeekends,
            sleepHoursPerDay,
            hoursAfterSleep: Math.max(
              0,
              (step1Data.includeWeekends
                ? totalHoursInMonth
                : totalHoursExcludingWeekends) -
                sleepHoursPerDay *
                  (step1Data.includeWeekends ? daysInMonth : includedDays),
            ),
            assumedWorkHoursPerWeek: 40,
            safeCommitmentHours,
          },
          weeklyCommitmentHours,
          monthlyCommitmentHours,
        },
        goals,
        allocation: {
          monthlyAllocatedHours,
          monthlyRemainingHours,
          isOverAllocated,
        },
        generatedPlanPreview: {
          epic: {
            name: epicName || monthKey,
            month: monthKey,
          },
          sprints: sprintsWithHours,
        },
        metadata: {
          createdAt: new Date().toISOString(),
          source: "wizard",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        },
      };

      return plan;
    }

    const planJson = buildPlan();

    // log the generated plan JSON for inspection
    try {
      // pretty print
      // eslint-disable-next-line no-console
      console.log("Generated plan:", JSON.stringify(planJson, null, 2));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("Generated plan:", planJson);
    }

    // convert generated plan, POST via utility, then update client store

    setSubmitting(true);
    try {
      const created = await submitGoalsForEpic(planJson);
      toast(
        "Epic created — now you can add a checklist to any task",
        "success",
      );
      // eslint-disable-next-line no-console
      console.log("submitGoalsForEpic - API response:", created);

      try {
        if (created) {
          const arr = Array.isArray(created) ? created : [created];
          // filter out epics already in store to avoid duplicates
          const toAdd = arr.filter((ep: any) => !epicById || !epicById[ep.id]);
          if (toAdd.length > 0) addEpicsFromApi(toAdd);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("store update failed", e);
      }

      resetWizardState();
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
            Create Epic From Goals — Step {step + 1} of 4
          </h2>
          <button
            onClick={handleCloseAttempt}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="mb-3">
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {step === 0
                ? "Epic Details"
                : step === 1
                  ? "Plan Your Monthly Capacity"
                  : step === 2
                    ? "Plan Sprints & Tasks"
                    : "Review & Create Epic"}
            </h2>
          </div>
          {step === 0 && (
            <WizardStep0
              month={step1Data.month || epicMonth}
              epicName={epicName}
              epicDescription={epicDescription}
              onChange={(patch) => {
                if (patch.month) {
                  setStep1Data((s) => ({ ...s, month: patch.month! }));
                  setEpicMonth(patch.month!);
                  setIsDirty(true);
                  // if epic name is auto-managed, update suggestion when month changes
                  if (epicNameAuto) {
                    try {
                      const [y, m] = (patch.month || "")
                        .split("-")
                        .map((s) => Number(s));
                      if (y && m) {
                        const d = new Date(y, m - 1, 1);
                        const label = d.toLocaleString(undefined, {
                          month: "long",
                          year: "numeric",
                        });
                        setEpicName(`${label} Epic`);
                        setEpicNameAuto(true);
                      }
                    } catch {}
                  }
                }
                if (patch.name !== undefined) {
                  setEpicName(patch.name as string);
                  setEpicNameAuto(false);
                  setIsDirty(true);
                }
                if (patch.description !== undefined) {
                  setEpicDescription(patch.description as string);
                  setIsDirty(true);
                }
              }}
              onCancel={handleCloseAttempt}
            />
          )}

          {step === 1 && (
            <WizardStep1
              data={{
                month: step1Data.month || epicMonth,
                includeWeekends: step1Data.includeWeekends,
                weeklyCommitment: step1Data.weeklyCommitment,
              }}
              epicName={epicName}
              epicDescription={epicDescription}
              onEpicChange={(p) => {
                if (typeof p.name === "string") setEpicName(p.name);
                if (typeof p.description === "string")
                  setEpicDescription(p.description);
              }}
              onChange={(patch) => {
                const next = { ...step1Data, ...patch };
                setStep1Data(next);
                setIsDirty(true);
                if (patch.month) setEpicMonth(patch.month);
              }}
              onNext={() => {
                setEpicMonth(step1Data.month || epicMonth);
                setStep(2);
              }}
              onCancel={handleCloseAttempt}
              onBack={() => setStep(0)}
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
              onChange={(patch) => {
                setStep2Data((s) => ({ ...s, ...patch }));
                setIsDirty(true);
              }}
            />
          )}

          {step === 3 && (
            <WizardStep3
              data={{
                epicId,
                epicName,
                epicDescription,
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
            {step > 0 && (
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
                  if (step === 0) {
                    const month = step1Data.month || epicMonth;
                    if (!month || !month.trim()) {
                      toast("Please select a month", "error");
                      return;
                    }
                    setEpicMonth(month);
                    setStep(1);
                    return;
                  }

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
