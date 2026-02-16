"use client";

import React, { useMemo } from "react";

type StepData = {
  month: string; // 'YYYY-MM'
  includeWeekends: boolean;
  weeklyCommitment: number;
};

type Props = {
  data: StepData;
  onChange: (patch: Partial<StepData>) => void;
  onNext?: () => void;
  onCancel?: () => void;
};

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function countWeekendDays(year: number, month: number) {
  // month is 1-12
  const days = daysInMonth(year, month);
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow === 0 || dow === 6) count++;
  }
  return count;
}

export default function WizardStep1({
  data,
  onChange,
  onNext,
  onCancel,
}: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }).map((_, idx) => {
      const date = new Date(currentYear, idx, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleString(undefined, {
        month: "long",
        year: "numeric",
      });
      return {
        key,
        label,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      };
    });
  }, [currentYear]);

  // Ensure defaults
  const monthKey = data.month || monthOptions[0].key;
  const includeWeekends = !!data.includeWeekends;
  const weeklyCommitment =
    typeof data.weeklyCommitment === "number" ? data.weeklyCommitment : 0;

  const [y, m] = monthKey.split("-").map((s) => Number(s));
  const days = daysInMonth(y, m);
  const totalHours = 24 * days;
  const weekendDays = countWeekendDays(y, m);
  const totalExcludingWeekends = totalHours - weekendDays * 24;
  const effectiveTotal = includeWeekends ? totalHours : totalExcludingWeekends;
  // number of days considered when computing sleep (only days included in availability)
  const includedDays = includeWeekends ? days : days - weekendDays;
  const sleepAdjusted = effectiveTotal - 8 * includedDays;
  const safeCommitment = Math.max(0, sleepAdjusted - 160);

  // monthly commitment derived from weekly hours (pro-rate by days/7)
  const monthlyCommitment =
    Math.round(weeklyCommitment * (days / 7) * 100) / 100;

  // progress bar zones (widths as percentages) - use effectiveTotal as baseline
  const denom = effectiveTotal > 0 ? effectiveTotal : 1;
  const greenWidth = Math.min(1, safeCommitment / denom) * 100;
  const yellowWidth =
    Math.min(1, Math.max(0, (sleepAdjusted - safeCommitment) / denom)) * 100;
  const redWidth = Math.max(0, 100 - greenWidth - yellowWidth);

  const commitmentPercent = Math.min(100, (monthlyCommitment / denom) * 100);

  return (
    <div className="px-2 py-2 space-y-6">
      {/* Month + Weekend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Month
          </label>
          <select
            value={monthKey}
            onChange={(e) => onChange({ month: e.target.value })}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            {monthOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 pt-6 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeWeekends}
            onChange={(e) => onChange({ includeWeekends: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
          />
          Include Saturdays & Sundays
        </label>
      </div>

      {/* Capacity Summary */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs space-y-1">
        <p className="text-xs">
          Total hours in month:
          <span className="ml-1 font-semibold">{totalHours}h</span>
        </p>

        <p className="text-xs">
          Total hours excluding weekends:
          <span className="ml-1 font-semibold">{totalExcludingWeekends}h</span>
        </p>

        <p className="text-xs">
          After deducting sleep (8h/day):
          <span className="ml-1 font-semibold">
            {Math.max(0, sleepAdjusted)}h
          </span>
        </p>

        <p className="text-xs">
          Recommended safe commitment:
          <span className="ml-1 font-semibold">
            {Math.max(0, Math.round(safeCommitment))}h
          </span>
        </p>

        <p className="pt-1 text-[11px] text-slate-500">
          {includeWeekends
            ? "Weekends are included in your available hours."
            : "Weekends are excluded from total available time."}
        </p>
      </div>

      {/* Weekly Commitment */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Hours you will dedicate per week
        </label>
        <input
          type="number"
          value={weeklyCommitment}
          onChange={(e) =>
            onChange({ weeklyCommitment: Number(e.target.value) || 0 })
          }
          placeholder="e.g. 20"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Monthly commitment</span>
          <span>
            {monthlyCommitment}h / {totalHours}h
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 h-5 w-full rounded-full bg-slate-200 relative overflow-visible">
          <div className="flex h-full rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${greenWidth}%` }}
            />
            <div
              className="h-full bg-yellow-400"
              style={{ width: `${yellowWidth}%` }}
            />
            <div
              className="h-full bg-rose-500"
              style={{ width: `${redWidth}%` }}
            />
          </div>

          {/* marker: larger, visible percentage badge above the bar */}
          <div
            style={{ left: `${commitmentPercent}%` }}
            className="absolute -top-6 -translate-x-1/2 z-10 pointer-events-none"
          >
            <div className="h-6 w-10 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center text-[11px] font-semibold text-slate-700">
              {Math.round(commitmentPercent)}%
            </div>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-slate-500">
          {monthlyCommitment <= safeCommitment ? (
            <>
              Current commitment sits inside the
              <span className="font-medium text-emerald-600"> safe zone</span>.
            </>
          ) : monthlyCommitment <= sleepAdjusted ? (
            <>
              Current commitment is in the
              <span className="font-medium text-yellow-600"> heavy zone</span>.
            </>
          ) : (
            <>
              Current commitment is in the
              <span className="font-medium text-rose-600"> overload zone</span>.
            </>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Safe
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-yellow-400" /> Heavy
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Overload
          </span>
        </div>
      </div>
    </div>
  );
}
