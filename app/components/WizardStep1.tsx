"use client";

import React, { useState, useEffect } from "react";

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
  epicName?: string;
  epicDescription?: string;
  onEpicChange?: (patch: { name?: string; description?: string }) => void;
  onBack?: () => void;
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
  epicName,
  epicDescription,
  onEpicChange,
  onBack,
}: Props) {
  const now = new Date();

  // Ensure defaults
  const defaultMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthKey = data.month || defaultMonthKey;
  const includeWeekends = !!data.includeWeekends;
  // numeric value used for calculations (0 when not provided)
  const weeklyCommitmentNum =
    typeof data.weeklyCommitment === "number" ? data.weeklyCommitment : 0;

  // local string state for the input so the number input can be cleared
  const [weeklyCommitmentStr, setWeeklyCommitmentStr] = useState<string>(
    typeof data.weeklyCommitment === "number"
      ? String(data.weeklyCommitment)
      : "",
  );

  useEffect(() => {
    setWeeklyCommitmentStr(
      typeof data.weeklyCommitment === "number"
        ? String(data.weeklyCommitment)
        : "",
    );
  }, [data.weeklyCommitment]);

  const [y, m] = monthKey.split("-").map((s) => Number(s));
  // If month is current month, exclude past days from calculations (use remaining days)
  const totalDaysInMonth = daysInMonth(y, m);
  const isCurrentMonth = y === now.getFullYear() && m === now.getMonth() + 1;
  const startDay = isCurrentMonth ? now.getDate() : 1;
  const days = Math.max(0, totalDaysInMonth - (startDay - 1));
  const totalMonthHours = 24 * days;
  // Count weekend days within the considered range
  function countWeekendDaysInRange(
    year: number,
    month: number,
    fromDay: number,
    toDay: number,
  ) {
    let count = 0;
    for (let d = fromDay; d <= toDay; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow === 0 || dow === 6) count++;
    }
    return count;
  }
  const weekendDays = countWeekendDaysInRange(y, m, startDay, totalDaysInMonth);
  const totalHoursExcludingWeekends = totalMonthHours - weekendDays * 24;

  // After deducting sleep (8h/day)
  const hoursAfterSleep = includeWeekends
    ? totalMonthHours - 8 * days
    : totalHoursExcludingWeekends - 8 * (days - weekendDays);

  const safeHoursPerDay = 6; // internal default
  const includedDays = includeWeekends ? days : Math.max(0, days - weekendDays);
  const recommendedSafeCommitment = Math.max(0, safeHoursPerDay * includedDays);

  // monthly commitment derived from weekly hours using full weeks + remainder days
  const fullWeeks = Math.round(days / 7);
  const remainderDays = days % 7;
  const dailyCommitment = weeklyCommitmentNum / 7;
  const monthlyCommitment = Math.round(fullWeeks * weeklyCommitmentNum);

  // Progress zones use totalMonthHours as baseline
  const yellowLimit = 10 * days; // 10 hours/day heavy workload
  const greenWidth = Math.max(
    0,
    Math.min(100, (recommendedSafeCommitment / totalMonthHours) * 100),
  );
  const yellowWidth = Math.max(
    0,
    Math.min(
      100 - greenWidth,
      ((yellowLimit - recommendedSafeCommitment) / totalMonthHours) * 100,
    ),
  );
  const redWidth = Math.max(0, 100 - greenWidth - yellowWidth);

  const commitmentPercent = Math.max(
    0,
    Math.min(100, (monthlyCommitment / totalMonthHours) * 100),
  );

  return (
    <div className="px-2 py-2 space-y-6">
      {/* Capacity Summary */}
      <div className="rounded-lg border border-border bg-muted p-4 text-xs space-y-1">
        <p className="text-xs">
          Total hours in month:
          <span className="ml-1 font-semibold">{totalMonthHours}h</span>
        </p>

        <p className="text-xs">
          Total hours excluding weekends:
          <span className="ml-1 font-semibold">
            {totalHoursExcludingWeekends}h
          </span>
        </p>

        <p className="text-xs">
          After deducting sleep (8h/day):
          <span className="ml-1 font-semibold">
            {Math.max(0, hoursAfterSleep)}h
          </span>
        </p>

        <p className="text-xs">
          Recommended safe commitment:
          <span className="ml-1 font-semibold">
            {Math.max(0, Math.round(recommendedSafeCommitment))}h
          </span>
        </p>

        <p className="pt-1 text-[11px] text-muted-foreground">
          {includeWeekends
            ? "Weekends are included in your available hours."
            : "Weekends are excluded from total available time."}
        </p>
      </div>

      {/* Weekly Commitment */}
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={includeWeekends}
          onChange={(e) => onChange({ includeWeekends: e.target.checked })}
          className="h-4 w-4 rounded border-border text-emerald-600"
        />
        Include Saturdays & Sundays
      </label>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Hours you will dedicate per week
        </label>
        <input
          type="number"
          value={weeklyCommitmentStr}
          onChange={(e) => {
            const v = e.target.value;
            setWeeklyCommitmentStr(v);
            onChange({ weeklyCommitment: v === "" ? undefined : Number(v) });
          }}
          placeholder="e.g. 20"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* safeHoursPerDay is internal (default 6) — no UI control */}

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Monthly commitment (based on selected month)</span>
          <span>
            {monthlyCommitment}h / {totalMonthHours}h
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 h-5 w-full rounded-full bg-muted relative overflow-visible">
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

          {/* marker: larger, visible percentage badge above the bar (hidden at 0%) */}
          {commitmentPercent > 0 && (
            <div
              style={{ left: `${commitmentPercent}%` }}
              className="absolute -top-6 -translate-x-1/2 z-10 pointer-events-none"
            >
              <div className="h-6 w-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-[11px] font-semibold text-foreground">
                {Math.round(commitmentPercent)}%
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 text-[11px] text-muted-foreground">
          {monthlyCommitment <= recommendedSafeCommitment ? (
            <>
              Current commitment sits inside the
              <span className="font-medium text-emerald-600"> safe zone</span>.
            </>
          ) : monthlyCommitment <= yellowLimit ? (
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

        <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
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
