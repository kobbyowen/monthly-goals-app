"use client";

import React from "react";

type Props = {
  data: any;
};

export default function WizardStep3({ data }: Props) {
  return (
    <div className="space-y-4 text-sm">
      <h4 className="font-semibold">Review</h4>
      <div>
        <div className="text-xs text-slate-500">Epic</div>
        <div className="mt-1 text-sm text-slate-900">{data.epicName}</div>
        {data.description && (
          <div className="mt-1 text-xs text-slate-600">{data.description}</div>
        )}
      </div>

      <div>
        <div className="text-xs text-slate-500">Sprints</div>
        <div className="mt-1 text-sm text-slate-900">
          {data.numSprints} sprint(s), {data.weeksPerSprint || 1} week(s) each
        </div>
        <div className="text-xs text-slate-600">
          Starts: {data.startDate || "—"}
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500">Planned tasks</div>
        <pre className="mt-1 rounded bg-slate-50 p-2 text-xs overflow-auto">
          {JSON.stringify(data.tasks || [], null, 2)}
        </pre>
      </div>
    </div>
  );
}
