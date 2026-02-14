"use client";

import React from "react";
import { Session as StoreSession } from "../stores/types";

type Props = {
  session: StoreSession;
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDurationHuman(totalSeconds: number) {
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `${hrs}h`;
  return `${hrs}h ${rem}m`;
}

export default function SessionItem({ session }: Props) {
  const isRunning = !session.endedAt;

  const duration =
    session.seconds ??
    (isRunning
      ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
      : 0);

  const start = formatTime(session.startedAt);
  const end = session.endedAt
    ? formatTime(session.endedAt)
    : formatTime(new Date().toISOString());
  const range = `${start} → ${end}`;
  const human = formatDurationHuman(duration);

  return (
    <div
      className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
        isRunning
          ? "border-yellow-200 bg-yellow-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <span className="font-mono text-slate-700">{range}</span>
      <span className="text-slate-500">{human}</span>
    </div>
  );
}
