"use client";

import React, { useMemo } from "react";

type Props = {
  month: string;
  epicName?: string;
  epicDescription?: string;
  onChange: (patch: {
    month?: string;
    name?: string;
    description?: string;
    goalsText?: string;
  }) => void;
  goalsText?: string;
  onNext?: () => void;
  onCancel?: () => void;
};

export default function WizardStep0({
  month,
  epicName,
  epicDescription,
  onChange,
  goalsText,
}: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const monthOptions = useMemo(() => {
    // show the next 12 months starting from current month (exclude past months)
    return Array.from({ length: 12 }).map((_, idx) => {
      const date = new Date(currentYear, now.getMonth() + idx, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleString(undefined, {
        month: "long",
        year: "numeric",
      });
      return { key, label };
    });
  }, [currentYear]);

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Month
        </label>
        <select
          value={month || ""}
          onChange={(e) => onChange({ month: e.target.value })}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
        >
          <option value="">Select month</option>
          {monthOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Epic name (optional)
        </label>
        <input
          type="text"
          value={epicName ?? ""}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. March Epic"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Motto / Description (optional)
        </label>
        <textarea
          value={epicDescription ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Short description or motto for this epic"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
          rows={2}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Outline your monthly goals (one per line) - hours will be set later
        </label>
        <textarea
          value={goalsText || ""}
          onChange={(e) => onChange({ goalsText: e.target.value })}
          placeholder={`Complete the rocket\nRead the entire bible`}
          rows={4}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
