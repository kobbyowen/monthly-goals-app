"use client";

import React from "react";

type Props = {
  data: any;
  onChange: (patch: Partial<any>) => void;
};

export default function WizardStep2({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600">
          Number of sprints
        </label>
        <input
          type="number"
          min={1}
          value={data.numSprints ?? 4}
          onChange={(e) => onChange({ numSprints: Number(e.target.value) })}
          className="mt-1 w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">
          Sprint length (weeks)
        </label>
        <input
          type="number"
          min={1}
          value={data.weeksPerSprint ?? 1}
          onChange={(e) => onChange({ weeksPerSprint: Number(e.target.value) })}
          className="mt-1 w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600">
          Start date
        </label>
        <input
          type="date"
          value={data.startDate || ""}
          onChange={(e) => onChange({ startDate: e.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
