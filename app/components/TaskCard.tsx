"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@lib/api";

type Props = {
  id: string;
  name: string;
  formattedElapsed: string;
  plannedTimeSeconds?: number;
  firstStarted?: number;
  completedAt?: number;
  sessions?: number;
  running?: boolean;
  completed?: boolean;
  onStart?: (id: string) => void;
  onPause?: (id: string) => void;
  onEnd?: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onOpen?: (id: string) => void;
  checklistTotal?: number;
  checklistCompleted?: number;
};

function fmtDate(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString();
}

export default function TaskCard({
  id,
  name,
  formattedElapsed,
  plannedTimeSeconds,
  firstStarted,
  completedAt,
  sessions,
  running,
  completed,
  onStart,
  onPause,
  onEnd,
  onUncomplete,
  onOpen,
  checklistTotal,
  checklistCompleted,
}: Props) {
  const router = useRouter();
  const [remoteTotal, setRemoteTotal] = useState<number | undefined>(undefined);
  const [remoteCompleted, setRemoteCompleted] = useState<number | undefined>(
    undefined,
  );

  async function fetchCounts() {
    try {
      const res = await fetch(withBase(`/api/tasks/${id}/checklists`));
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setRemoteTotal(data.length);
        setRemoteCompleted(data.filter((d: any) => d.completed).length);
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    if (typeof checklistTotal === "undefined") fetchCounts();
  }, [id, checklistTotal]);

  useEffect(() => {
    function onChange(e: any) {
      try {
        const detail = e?.detail;
        if (!detail || detail.taskId === id) fetchCounts();
      } catch (err) {
        // ignore
      }
    }
    window.addEventListener("checklist:changed", onChange as EventListener);
    return () =>
      window.removeEventListener(
        "checklist:changed",
        onChange as EventListener,
      );
  }, [id]);

  const totalToShow =
    typeof checklistTotal !== "undefined" ? checklistTotal : remoteTotal;
  const completedToShow =
    typeof checklistCompleted !== "undefined"
      ? checklistCompleted
      : remoteCompleted;
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [saving, setSaving] = useState(false);

  const hasProgress = !completed && (sessions || 0) > 0;
  const pauseLabel = !running && hasProgress ? "Continue" : "Pause";

  function formatEstimate(seconds?: number) {
    if (!seconds || seconds <= 0) return "—";
    const minsTotal = Math.round(seconds / 60);
    const hrs = Math.floor(minsTotal / 60);
    const mins = minsTotal % 60;
    if (hrs && mins) return `${hrs}h ${mins}m`;
    if (hrs) return `${hrs}h`;
    return `${mins}m`;
  }

  function parseFormattedElapsed(str?: string) {
    if (!str) return 0;
    const parts = str.split(":").map((p) => parseInt(p, 10) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  }

  function fmtHumanShort(s?: number) {
    if (!s || s <= 0) return "0m";
    const mins = Math.floor(s / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    if (rem === 0) return `${hrs}h`;
    return `${hrs}h ${rem}m`;
  }

  const [localElapsed, setLocalElapsed] = useState(() =>
    parseFormattedElapsed(formattedElapsed),
  );

  useEffect(() => {
    setLocalElapsed(parseFormattedElapsed(formattedElapsed));
  }, [formattedElapsed]);

  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => setLocalElapsed((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const percent =
    plannedTimeSeconds && plannedTimeSeconds > 0
      ? Math.min(1, localElapsed / plannedTimeSeconds)
      : 0;
  return (
    <div
      onClick={() => onOpen && onOpen(id)}
      className="w-full max-w-xs rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 truncate">{name}</h3>
          {/* indicators removed; showing compact fraction only */}
        </div>

        <div className="flex items-center gap-2">
          {typeof totalToShow !== "undefined" && totalToShow > 0 && (
            <span className="text-xs text-slate-500">
              {completedToShow || 0}/{totalToShow}
            </span>
          )}

          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
              completed
                ? "bg-green-100 text-green-700"
                : running
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
            }`}
          >
            {completed ? "Done" : running ? "Running" : "Idle"}
          </span>
        </div>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>{fmtHumanShort(localElapsed)}</span>
          <span>
            Est.{" "}
            <span className="text-slate-700 font-medium">
              {formatEstimate(plannedTimeSeconds)}
            </span>
          </span>
        </div>

        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200">
          <div
            className="h-1.5 rounded-full bg-yellow-500 transition-all"
            style={{ width: `${Math.round(percent * 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {!completed ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (running) onPause && onPause(id);
                else onStart && onStart(id);
              }}
              className="flex-1 rounded-md bg-rose-600 py-1 text-[11px] font-semibold text-white hover:bg-rose-700"
            >
              {running ? "Stop" : "Start"}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnd && onEnd(id);
              }}
              className="flex-1 rounded-md bg-emerald-600 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
            >
              Done
            </button>
          </>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUncomplete && onUncomplete(id);
            }}
            className="flex-1 rounded-md bg-yellow-500 py-1 text-[11px] font-semibold text-white hover:bg-yellow-600"
          >
            Uncomplete
          </button>
        )}
      </div>
    </div>
  );
}
