"use client";

import React from "react";

type Props = {
  data: any;
};

function daysInMonth(key?: string) {
  try {
    if (!key) return new Date().getDate();
    const [y, m] = key.split("-").map((s) => Number(s));
    if (!y || !m) return new Date().getDate();
    return new Date(y, m, 0).getDate();
  } catch {
    return new Date().getDate();
  }
}

export default function WizardStep3({ data }: Props) {
  const step1 = data.step1 || {};
  const step2 = data.step2 || {};
  const monthKey = data.epicMonth || step1.month || "";
  // compute days left in the selected month (exclude elapsed days if it's the current month)
  const totalDaysInMonth = daysInMonth(monthKey);
  const now = new Date();
  const [mkY, mkM] = (monthKey || "").split("-").map((s: string) => Number(s));
  const isCurrentMonth =
    mkY === now.getFullYear() && mkM === now.getMonth() + 1;
  const startDay = isCurrentMonth ? now.getDate() : 1;
  const days = Math.max(0, totalDaysInMonth - (startDay - 1));
  const includeWeekends = !!step1.includeWeekends;
  const weeklyCommitment = Number(step1.weeklyCommitment || 0);
  const totalHours = days * 24;
  const fullWeeks = Math.round(days / 7);
  const remainderDays = days % 7;
  const dailyCommitment = weeklyCommitment / 7;
  const monthlyCommitment = Math.round(fullWeeks * weeklyCommitment);

  const goals = (step2.goals || []).map((g: any) => {
    const rawHours =
      typeof g.hours === "number" ? g.hours : Number(g.hours || 0);
    const weekly =
      g.effortType === "monthly" ? Math.round((rawHours * 7) / days) : rawHours;
    return { ...g, hours: rawHours, weekly };
  });

  const usedWeekly = goals.reduce(
    (s: number, g: any) => s + (g.weekly || 0),
    0,
  );
  const percent = Math.min(
    100,
    Math.round((monthlyCommitment / totalHours) * 100),
  );

  // simple zone widths for visual: green/yellow/red split by thirds
  const greenW = Math.min(100, percent);
  const yellowW = percent > 33 ? Math.min(34, percent - 33) : 0;
  const redW = percent > 67 ? Math.min(100, percent - 67) : 0;

  // compute week-aligned sprints for the month (full list)
  const monthParts = (monthKey || "").split("-");
  let allWeeks: { start: Date; end: Date }[] = [];
  if (monthParts.length >= 2) {
    const y = Number(monthParts[0]);
    const m = Number(monthParts[1]) - 1;
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);

    // first week: starts on the month's first day, ends on the upcoming Sunday (or month end)
    const firstStart = new Date(first);
    const firstEnd = new Date(firstStart);
    const daysUntilSunday = (7 - firstStart.getDay()) % 7; // 0 if Sunday
    firstEnd.setDate(firstStart.getDate() + daysUntilSunday);
    if (firstEnd > last) firstEnd.setTime(last.getTime());
    allWeeks.push({ start: new Date(firstStart), end: new Date(firstEnd) });

    // subsequent weeks: Monday -> Sunday until month end
    let nextStart = new Date(firstEnd);
    nextStart.setDate(firstEnd.getDate() + 1);
    while (nextStart <= last) {
      const weekStart = new Date(nextStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      if (weekEnd > last) weekEnd.setTime(last.getTime());
      allWeeks.push({ start: weekStart, end: weekEnd });
      nextStart = new Date(weekEnd);
      nextStart.setDate(weekEnd.getDate() + 1);
    }
  }

  // helpers for day counts
  function daysInclusive(a: Date, b: Date) {
    return Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  }
  function workingDaysInclusive(a: Date, b: Date) {
    let cnt = 0;
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) cnt++;
    }
    return cnt;
  }

  // determine which weeks are considered valid (same logic as generator)
  const validWeeks = allWeeks.filter((w) => {
    const total = daysInclusive(w.start, w.end);
    if (includeWeekends) return total >= 2;
    const work = workingDaysInclusive(w.start, w.end);
    return work >= 2;
  });

  // For rendering, we'll show all weeks but mark skipped ones with a note
  const previewWeeks = allWeeks;

  // Build deterministic list of active sprints (filtered weeks) and assign
  // a global sequential sprint index for naming (Sprint 01, 02, ...)
  const sprintsPreview = previewWeeks.map((w, i) => ({
    weekNumber: i + 1,
    start: w.start,
    end: w.end,
    startDate: formatIso(w.start),
    endDate: formatIso(w.end),
  }));

  const filteredPreview = sprintsPreview.filter((sp) => {
    const total = daysInclusive(sp.start, sp.end);
    if (includeWeekends) return total >= 2;
    const work = workingDaysInclusive(sp.start, sp.end);
    return work >= 2;
  });

  let globalSeq = 0;
  const sprintsWithHours = filteredPreview.map((sp) => {
    const daysCount = includeWeekends
      ? daysInclusive(sp.start, sp.end)
      : workingDaysInclusive(sp.start, sp.end);
    globalSeq++;
    const seq = String(globalSeq).padStart(2, "0");
    const name = `Week ${sp.weekNumber} Sprint ${seq}`;
    // full week => full weekly commitment; partial => proportional over 7 days
    const isFullWeek = includeWeekends ? daysCount === 7 : daysCount === 5;
    const hours = isFullWeek
      ? weeklyCommitment
      : Math.round((weeklyCommitment / 7) * daysCount);
    return {
      weekNumber: sp.weekNumber,
      name,
      startDate: sp.startDate,
      endDate: sp.endDate,
      hours,
    };
  });

  // Reassign sequence numbers so that numbering starts from the first enabled (non-past) sprint.
  // Past sprints keep their week label but do not consume a sequence number.
  (function reseq() {
    let seqCounter = 0;
    const now = Date.now();
    for (const s of sprintsWithHours) {
      const endIso = s.endDate || (s as any).end || null;
      const isPast = endIso ? Date.parse(endIso) < now : false;
      (s as any).isPast = isPast;
      if (!isPast) {
        seqCounter++;
        const seq = String(seqCounter).padStart(2, "0");
        s.name = `Week ${s.weekNumber} Sprint ${seq}`;
      } else {
        // past sprints: remove sprint numeric suffix
        s.name = `Week ${s.weekNumber} Sprint`;
      }
    }
  })();

  // Post-process: ensure total month hours >= calculated monthly commitment by padding last sprint
  try {
    const totalMonthHours = sprintsWithHours.reduce(
      (acc, s) => acc + (s.hours || 0),
      0,
    );
    const minMonthlyRequired =
      Math.round(
        (fullWeeks * weeklyCommitment + remainderDays * dailyCommitment) * 100,
      ) / 100;
    if (totalMonthHours < minMonthlyRequired && sprintsWithHours.length > 0) {
      const diff = Math.round(minMonthlyRequired - totalMonthHours || 0);
      sprintsWithHours[sprintsWithHours.length - 1].hours =
        (sprintsWithHours[sprintsWithHours.length - 1].hours || 0) + diff;
    }
  } catch (e) {
    // best-effort
  }

  function formatIso(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  return (
    <div className="space-y-6 px-4 py-4">
      {/* Monthly Overview */}
      <div className="rounded-lg border border-border bg-muted p-4 text-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Monthly Overview
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Month</p>
            <p className="font-semibold text-foreground">{monthKey || "—"}</p>
          </div>

          <div>
            <p className="text-muted-foreground">Weekends</p>
            <p className="font-semibold text-foreground">
              {includeWeekends ? "Included" : "Excluded"}
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Weekly Commitment</p>
            <p className="font-semibold text-foreground">
              {weeklyCommitment}h / week
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Monthly commitment</p>
            <p className="font-semibold text-foreground">
              {monthlyCommitment}h
            </p>
          </div>
        </div>
      </div>

      {/* Capacity Summary */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Capacity Usage
        </h3>

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Commitment vs available hours</span>
          <span>
            {monthlyCommitment}h / {totalHours}h
          </span>
        </div>

        <div className="mt-2 h-3 w-full rounded-full overflow-hidden bg-muted flex">
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${greenW}%` }}
          />
          <div
            className="h-full bg-yellow-400"
            style={{ width: `${yellowW}%` }}
          />
          <div className="h-full bg-rose-500" style={{ width: `${redW}%` }} />
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {percent <= 33
            ? "Your plan is within a healthy commitment range."
            : percent <= 67
              ? "Your plan is moderately heavy — consider reducing if needed."
              : "Your plan exceeds a safe commitment range."}
        </p>
      </div>

      {/* Goals Summary */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Goals
          </h3>
          <div className="text-xs text-muted-foreground">
            {goals.length} goal{goals.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="mt-2 space-y-2">
          {goals.length === 0 && (
            <div className="text-xs text-muted-foreground">No goals added.</div>
          )}
          {goals.map((g: any) => (
            <div
              key={g.id}
              className="rounded-md border border-border px-3 py-2 text-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <p className="font-medium text-foreground flex-1 min-w-0 overflow-hidden truncate whitespace-nowrap">
                  {g.name}
                </p>
                {/* priority badge */}
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    (g.priority || "").toLowerCase() === "high"
                      ? "bg-red-500 text-white"
                      : (g.priority || "").toLowerCase() === "medium"
                        ? "bg-yellow-400 text-black"
                        : "bg-gray-400 text-black"
                  }`}
                >
                  {(g.priority || "").toLowerCase()}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground ml-4 whitespace-nowrap flex-shrink-0">
                {g.effortType === "monthly"
                  ? `${g.hours}h / month`
                  : `${g.weekly}h / week`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-generated preview */}
      {previewWeeks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Epic Overview
          </h3>
          <div className="mt-2 rounded-md border border-border px-3 py-3 text-sm bg-card text-card-foreground">
            <div className="text-sm font-semibold text-emerald-600">
              {data.epicName || monthKey || "—"}
            </div>
            {data.epicDescription && (
              <div className="mt-1 text-xs text-muted-foreground italic">
                {data.epicDescription}
              </div>
            )}
            <div className="mt-3 text-xs text-muted-foreground space-y-2">
              {(() => {
                const fmt = (d: Date) =>
                  d.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });
                // build list of render rows: use sprintsWithHours for active weeks
                const rows: React.ReactNode[] = [];
                previewWeeks.forEach((w, i) => {
                  const totalDays = daysInclusive(w.start, w.end);
                  const workDays = workingDaysInclusive(w.start, w.end);
                  const isValid = validWeeks.some(
                    (vw) =>
                      vw.start.getTime() === w.start.getTime() &&
                      vw.end.getTime() === w.end.getTime(),
                  );
                  const weekNum = i + 1;
                  const isoStart = formatIso(w.start);
                  const isoEnd = formatIso(w.end);
                  const sp = sprintsWithHours.find(
                    (s) => s.startDate === isoStart && s.endDate === isoEnd,
                  );
                  if (sp) {
                    const isPast = !!(sp as any).isPast;
                    rows.push(
                      <div
                        key={`g_${i}`}
                        className={`flex items-center justify-between ${isPast ? "opacity-60 italic" : ""}`}
                      >
                        <div className="text-card-foreground">{sp.name}</div>
                        <div className="text-muted-foreground">{`${fmt(w.start)} — ${fmt(w.end)} · ${sp.hours}h ${isPast ? "· past" : ""}`}</div>
                      </div>,
                    );
                  } else {
                    rows.push(
                      <div
                        key={`s_${i}`}
                        className="flex items-center justify-between"
                      >
                        <div className="text-muted-foreground italic">
                          Week {weekNum} Sprint
                          <span className="ml-2 text-xs text-muted-foreground">
                            (skipped for insufficient days -{" "}
                            {includeWeekends ? `${totalDays}` : `${workDays}`}{" "}
                            day
                            {(includeWeekends ? totalDays : workDays) === 1
                              ? ""
                              : "s"}
                            )
                          </span>
                        </div>
                        <div className="text-muted-foreground">{""}</div>
                      </div>,
                    );
                  }
                });
                return rows;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
