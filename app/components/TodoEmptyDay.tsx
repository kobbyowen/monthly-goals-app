"use client";
import React from "react";

export default function TodoEmptyDay({
  title = "Today",
  dateLabel,
  onGenerate,
}: {
  title?: string;
  dateLabel?: string;
  onGenerate?: () => void;
}) {
  return (
    <section className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {dateLabel}
        </span>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:bg-[#0b0b0b] dark:border-gray-800">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          No todos generated for today.
        </p>

        <button
          onClick={() => onGenerate && onGenerate()}
          className="mt-4 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Generate Todos for Today
        </button>
      </div>
    </section>
  );
}
