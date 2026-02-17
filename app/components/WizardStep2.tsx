"use client";

import React, { useMemo, useState } from "react";

type Props = {
  data: any;
  onChange: (patch: Partial<any>) => void;
  weeklyLimit?: number;
  epicMonth?: string; // YYYY-MM
};

type Goal = {
  id: string;
  name: string;
  hours?: number; // the number entered (weekly or monthly depending on effortType)
  effortType: "weekly" | "monthly";
  priority: "High" | "Medium" | "Low";
};

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

export default function WizardStep2({
  data,
  onChange,
  weeklyLimit = 0,
  epicMonth,
}: Props) {
  // compute days left in selected month (exclude elapsed days if it's the current month)
  function daysLeftInMonthFromKey(key?: string) {
    try {
      if (!key) return new Date().getDate();
      const [y, m] = key.split("-").map((s) => Number(s));
      if (!y || !m) return new Date().getDate();
      const total = new Date(y, m, 0).getDate();
      const now = new Date();
      if (now.getFullYear() === y && now.getMonth() + 1 === m) {
        return Math.max(0, total - (now.getDate() - 1));
      }
      return total;
    } catch {
      return new Date().getDate();
    }
  }

  const days = daysLeftInMonthFromKey(epicMonth) || new Date().getDate();

  const defaultGoals: Goal[] = [
    {
      id: `g_${Date.now()}_1`,
      name: "",
      hours: 1,
      effortType: "weekly",
      priority: "High",
    },
    {
      id: `g_${Date.now()}_2`,
      name: "",
      hours: 1,
      effortType: "weekly",
      priority: "Medium",
    },
  ];

  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const incoming = (data && data.goals) || null;
      if (Array.isArray(incoming) && incoming.length > 0) {
        return incoming.map((g: any) => ({
          id: g.id || `g_${Math.random().toString(36).slice(2, 9)}`,
          name: typeof g.name === "string" ? g.name : "",
          hours:
            typeof g.hours === "number"
              ? g.hours
              : g.hours
                ? Number(g.hours)
                : undefined,
          effortType: g.effortType === "monthly" ? "monthly" : "weekly",
          priority: g.priority || "Medium",
        }));
      }
    } catch (e) {
      // ignore and fall back to defaults
    }
    return defaultGoals;
  });

  function addGoal() {
    const newGoal: Goal = {
      id: `g_${Date.now()}`,
      name: "",
      hours: 1,
      effortType: "weekly",
      priority: "Medium",
    };
    // prevent adding if it would immediately exceed weekly limit
    const used = usedWeeklyHours(goals);
    const addition = toWeeklyEquivalent(newGoal);
    if (weeklyLimit > 0 && used + addition > weeklyLimit) {
      // show error toast via onChange hook or simply do nothing for now
      // but better: allow add and show validation on the row — here we'll allow add but mark overallocated elsewhere
    }
    setGoals((g) => [...g, newGoal]);
  }

  function removeGoal(id: string) {
    setGoals((g) => g.filter((x) => x.id !== id));
  }

  function updateGoal(id: string, patch: Partial<Goal>) {
    setGoals((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function toWeeklyEquivalent(goal: Goal) {
    const h = Number(goal.hours || 0);
    if (goal.effortType === "weekly") return h;
    // For monthly goals, distribute across full weeks left in the selected month.
    // Compute number of full weeks remaining and divide monthly hours equally across them.
    // If there are no full weeks left, place all hours in a single upcoming week.
    const daysLeft = days;
    const fullWeeks = Math.round(daysLeft / 7);
    if (fullWeeks >= 1) {
      return Math.round(h / fullWeeks);
    }
    return h;
  }

  function monthlyEquivalent(goal: Goal) {
    const h = Number(goal.hours || 0);
    if (goal.effortType === "monthly") return h;
    const daysLeft = days;
    const fullWeeks = Math.round(daysLeft / 7);
    // weekly -> monthly = weekly * (days / 7)
    return h * fullWeeks;
  }

  function usedWeeklyHours(list: Goal[]) {
    return list.reduce((acc, g) => acc + toWeeklyEquivalent(g), 0);
  }

  const used = usedWeeklyHours(goals);
  const remaining = Math.max(0, (weeklyLimit || 0) - used);
  const percent =
    weeklyLimit > 0 ? Math.min(100, (used / weeklyLimit) * 100) : 0;

  // validation helpers
  function rowError(g: Goal) {
    if (!g.name.trim()) return "Name required";
    if (!(typeof g.hours === "number" && g.hours > 0))
      return "Hours must be > 0";
    return null;
  }

  // expose goals upstream if caller wants them
  const suppressOnChangeRef = React.useRef(false);
  React.useEffect(() => {
    if (suppressOnChangeRef.current) {
      suppressOnChangeRef.current = false;
      return;
    }
    onChange?.({ goals });
  }, [goals]);

  // if parent supplies `data.goals` (e.g., when navigating back), sync it into local state
  React.useEffect(() => {
    try {
      const incoming = (data && data.goals) || null;
      if (!Array.isArray(incoming)) return;

      const incomingNormalized = incoming.map((g: any) => ({
        id: g.id || `g_${Math.random().toString(36).slice(2, 9)}`,
        name: typeof g.name === "string" ? g.name : "",
        hours:
          typeof g.hours === "number"
            ? g.hours
            : g.hours
              ? Number(g.hours)
              : undefined,
        effortType: (g.effortType === "monthly" ? "monthly" : "weekly") as
          | "weekly"
          | "monthly",
        priority: (g.priority || "Medium") as "High" | "Medium" | "Low",
      }));

      // cheap deep-equality check to avoid unnecessary state updates
      try {
        const a = JSON.stringify(incomingNormalized);
        const b = JSON.stringify(goals);
        if (a === b) return;
      } catch (e) {
        // fallthrough to set state
      }

      suppressOnChangeRef.current = true;
      setGoals(incomingNormalized);
    } catch (e) {
      // noop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data && data.goals]);

  return (
    <div className="space-y-3 px-4 py-3 sm:px-6 sm:py-4">
      {/* Allocation summary */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">Allocated weekly hours</span>
          <span className="font-semibold text-slate-900">
            {used}h / {weeklyLimit}h
          </span>
        </div>

        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <p className="mt-2 text-xs text-slate-500">{remaining}h remaining</p>
      </div>

      <div className="rounded-md border border-slate-200 bg-blue-50 p-2 text-xs text-slate-700">
        <strong className="font-medium">Note:</strong> Setting a goal's
        frequency to <em>Monthly</em> will make the wizard automatically
        position and distribute that goal across the sprints based on priority.
        <br />
        Higher-priority monthly goals are placed earlier in the month.
        <br />
        Set a goal to weekly if you want to work on it every week
      </div>

      {/* Goals list - constrain height so modal doesn't grow; make list scrollable */}
      <div className="max-h-60 overflow-auto pr-2 space-y-2">
        {goals.map((g) => {
          const err = rowError(g);
          const weeklyEq = toWeeklyEquivalent(g);
          const monthlyEq = monthlyEquivalent(g);
          const overalloc = weeklyLimit > 0 && used > weeklyLimit;
          return (
            <div key={g.id} className="rounded-lg border border-slate-200 p-2">
              <div className="grid grid-cols-12 gap-1 items-center">
                <input
                  type="text"
                  placeholder="Goal name"
                  value={g.name}
                  onChange={(e) => updateGoal(g.id, { name: e.target.value })}
                  className={`col-span-12 sm:col-span-6 rounded-md border border-slate-300 px-3 py-1 text-sm focus:border-emerald-500 focus:outline-none ${err ? "border-rose-400" : ""}`}
                />

                <div className="col-span-3 sm:col-span-1 md:col-span-1">
                  <input
                    type="number"
                    placeholder="Hrs"
                    value={g.hours ?? ""}
                    onChange={(e) =>
                      updateGoal(g.id, {
                        hours:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                    className={`w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-center focus:border-emerald-500 focus:outline-none ${
                      (g.hours ?? 0) <= 0 ? "border-rose-400" : ""
                    }`}
                  />
                </div>

                <select
                  value={g.effortType}
                  onChange={(e) =>
                    updateGoal(g.id, { effortType: e.target.value as any })
                  }
                  className="col-span-3 sm:col-span-2 md:col-span-2 rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  <option value="weekly">/week</option>
                  <option value="monthly">/month</option>
                </select>

                <select
                  value={g.priority}
                  onChange={(e) =>
                    updateGoal(g.id, { priority: e.target.value as any })
                  }
                  className="col-span-3 sm:col-span-2 md:col-span-2 rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>

                <button
                  onClick={() => removeGoal(g.id)}
                  className="col-span-2 sm:col-span-1 text-rose-500 text-xs hover:text-rose-600"
                >
                  Delete
                </button>

                <div className="col-span-12 text-xs text-slate-600 mt-1">
                  Monthly:{" "}
                  <span className="font-medium text-slate-900">
                    {monthlyEq}h
                  </span>{" "}
                  · Weekly:{" "}
                  <span className="font-medium text-slate-900">
                    {weeklyEq}h
                  </span>
                </div>
                <div className="col-span-12 mt-1">
                  <div className="text-xs text-rose-500">
                    {err ??
                      (overalloc ? "Allocation exceeds weekly limit" : "")}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={addGoal}
        disabled={weeklyLimit > 0 && used >= weeklyLimit}
        className={`text-sm font-medium ${weeklyLimit > 0 && used >= weeklyLimit ? "text-slate-400 cursor-not-allowed" : "text-emerald-600 hover:underline"}`}
      >
        + Add Goal
      </button>
    </div>
  );
}
