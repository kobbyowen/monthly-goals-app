"use client";

import React, { useMemo, useState, useEffect } from "react";

type Props = {
  name: string;
  badge?: string;
  // expected formats: "2m / 10m", "1:30 / 2:00", or single value "2m" (used)
  time?: string;
  usedSec?: number;
  plannedSec?: number;
  running?: boolean;
  leftText?: string;
  rightText?: string;
  onLeft?: (() => void) | null;
  onRight?: (() => void) | null;
  leftClass?: string;
  rightClass?: string;
  leftDisabled?: boolean;
  rightDisabled?: boolean;
};

function parseTimeToSeconds(str: string | undefined): number | null {
  if (!str) return null;
  const s = str.trim();
  if (!s) return null;

  // HH:MM:SS or MM:SS or H:MM
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => Number(p.trim()));
    if (parts.some((n) => Number.isNaN(n))) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }

  // tokens like "1h 30m", "90m", "45s"
  const regex =
    /([\d.]+)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)/gi;
  let match: RegExpExecArray | null;
  let total = 0;
  let found = false;
  while ((match = regex.exec(s)) !== null) {
    found = true;
    const val = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith("h")) total += val * 3600;
    else if (unit.startsWith("m")) total += val * 60;
    else total += val;
  }
  if (found) return total;

  // fallback: plain number -> assume minutes
  const num = parseFloat(s);
  if (!Number.isNaN(num)) return num * 60;
  return null;
}

function fmtHumanShort(s?: number | null) {
  if (!s || s <= 0) return "0m";
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `${hrs}h`;
  return `${hrs}h ${rem}m`;
}

function formatEstimate(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "0m";
  const minsTotal = Math.round(seconds / 60);
  const hrs = Math.floor(minsTotal / 60);
  const mins = minsTotal % 60;
  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins}m`;
}

export default function MiniTaskCard({
  name,
  badge,
  time,
  usedSec: usedSecProp,
  plannedSec: plannedSecProp,
  running,
  leftText,
  rightText,
  onLeft,
  onRight,
  leftClass,
  rightClass,
  leftDisabled,
  rightDisabled,
}: Props) {
  const parsed = useMemo(() => {
    if (typeof usedSecProp === "number" || typeof plannedSecProp === "number") {
      const used = Number(usedSecProp || 0);
      const planned = Number(plannedSecProp || 0);
      const pct =
        planned > 0
          ? Math.max(0, Math.min(100, Math.round((used / planned) * 100)))
          : 0;
      return { usedSec: used, plannedSec: planned, percent: pct };
    }
    if (!time) return { usedSec: 0, plannedSec: 0, percent: 0 };
    const parts = time.split("/");
    const left = parts[0]?.trim();
    const right = parts[1]?.trim();
    const used = parseTimeToSeconds(left) ?? 0;
    const planned = parseTimeToSeconds(right) ?? 0;
    const pct =
      planned > 0
        ? Math.max(0, Math.min(100, Math.round((used / planned) * 100)))
        : 0;
    return { usedSec: used, plannedSec: planned, percent: pct };
  }, [time, usedSecProp, plannedSecProp]);

  const [localUsed, setLocalUsed] = useState<number>(parsed.usedSec);

  useEffect(() => {
    setLocalUsed(parsed.usedSec);
  }, [parsed.usedSec]);

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setLocalUsed((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const usedSec = localUsed;
  const plannedSec = parsed.plannedSec;
  const percent =
    plannedSec > 0
      ? Math.max(0, Math.min(100, Math.round((usedSec / plannedSec) * 100)))
      : 0;

  return (
    <div className="rounded-lg border border-border bg-muted p-2 text-foreground">
      <div className="flex items-center justify-between min-w-0">
        <span className="text-xs font-medium text-foreground flex-1 min-w-0 overflow-hidden truncate whitespace-nowrap">
          {name}
        </span>
        {badge && (
          <span className="rounded-full bg-card px-2 py-0.5 text-[10px] text-card-foreground flex-shrink-0 ml-2">
            {badge}
          </span>
        )}
      </div>

      {/* Left: used time, Right: estimate */}
      <div className="mt-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{fmtHumanShort(usedSec)}</span>
          <span>
            Est.{" "}
            <span className="text-foreground font-medium">
              {formatEstimate(plannedSec)}
            </span>
          </span>
        </div>

        {/* progress bar and action buttons intentionally removed for mini view */}
      </div>
    </div>
  );
}
