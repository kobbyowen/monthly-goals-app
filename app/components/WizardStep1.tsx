"use client";

import React from "react";

type Props = {
  data: any;
  onChange: (patch: Partial<any>) => void;
};

export default function WizardStep1({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600">
          Epic name
        </label>
        <input
          value={data.epicName || ""}
          onChange={(e) => onChange({ epicName: e.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Monthly goals for Q1"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">
          Description (optional)
        </label>
        <textarea
          value={data.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          rows={3}
          placeholder="High level goals for the epic"
        />
      </div>
    </div>
  );
}
