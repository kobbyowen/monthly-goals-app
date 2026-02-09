"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  name: string;
  formattedElapsed: string;
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
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [saving, setSaving] = useState(false);
  return (
    <div
      onClick={() => onOpen && onOpen(id)}
      className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-4 shadow-sm cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="pr-2">
          <button onClick={() => onOpen && onOpen(id)} className="text-left">
            <h3 className="text-sm font-semibold text-slate-900 truncate">
              {name}
            </h3>
          </button>
          <div className="mt-1 text-xs text-slate-500">
            {sessions || 0} sessions
          </div>
        </div>

        <div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${completed ? "bg-green-100 text-green-700" : running ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}
          >
            {completed ? "Done" : running ? "Running" : "Idle"}
          </span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <span className="font-mono text-2xl font-bold text-slate-900">
          {formattedElapsed}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs text-slate-600">
        <div className="flex justify-between">
          <span>Started</span>
          <span className="font-medium text-slate-800">
            {firstStarted ? new Date(firstStarted).toLocaleString() : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Ended</span>
          <span className="italic">
            {completedAt ? new Date(completedAt).toLocaleString() : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Sessions</span>
          <span className="font-medium text-slate-800">{sessions || 0}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {!completed ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (running) {
                  onPause && onPause(id);
                } else {
                  onStart && onStart(id);
                }
              }}
              className={`rounded-lg py-1.5 text-xs font-semibold text-white ${running ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {running ? "Stop" : "Start"}
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onPause && onPause(id);
              }}
              className="rounded-lg bg-slate-100 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Pause
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnd && onEnd(id);
              }}
              className="rounded-lg bg-rose-600 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              End
            </button>
          </>
        ) : (
          <>
            <div />
            <div />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUncomplete && onUncomplete(id);
              }}
              className="rounded-lg bg-yellow-500 py-1.5 text-xs font-semibold text-white hover:bg-yellow-600"
            >
              Uncomplete
            </button>
          </>
        )}
      </div>
    </div>
  );
}
