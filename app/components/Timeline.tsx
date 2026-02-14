"use client";

import React from "react";

type Item = {
  timeLabel: string;
  width: string;
  label: string;
  colorClass: string;
};

export default function Timeline({ items }: { items: Item[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-xs text-slate-400">No sessions recorded yet.</div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 overflow-x-auto">
      <div className="space-y-3 min-w-70">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="w-14 text-xs text-slate-500">
              {item.timeLabel}
            </span>
            <div className="flex-1 h-3 rounded bg-slate-200">
              <div
                className={"h-3 rounded " + item.colorClass}
                style={{ width: item.width }}
              />
            </div>
            <span className="text-xs truncate">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
