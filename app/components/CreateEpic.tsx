"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateEpic({
  onCreated,
}: {
  onCreated?: (epic: any) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sprintNames, setSprintNames] = useState<string[]>([
    "Week 1 Sprint",
    "Week 2 Sprint",
    "Week 3 Sprint",
    "Week 4 Sprint",
  ]);
  const [loading, setLoading] = useState(false);

  async function create() {
    if (!name) return;
    setLoading(true);
    try {
      const payload = { name, sprints: sprintNames.filter(Boolean) };
      const res = await fetch(`/api/epics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let created: any = null;
      try {
        created = await res.json();
      } catch (e) {
        // ignore json parse errors
      }
      if (!res.ok) {
        const msg =
          (created && (created.error || created.message)) ||
          `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }
      // inform parent about the new epic so UI lists can update without full reload
      try {
        if (onCreated) onCreated(created);
        else router.refresh();
      } catch (e) {
        // ignore callback errors
      }
      setOpen(false);
      // navigate to the newly created epic using the id returned by the server
      router.push(`/epics/${created.id}`);
    } catch (err) {
      console.error("Create epic failed:", err);
      if (err instanceof Error) {
        alert(`Could not create epic: ${err.message}`);
      } else {
        alert(`Could not create epic: ${String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition"
      >
        New Monthly Epic
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-40"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Create New Monthly Epic</h3>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Monthly Epic name
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Initial weekly sprints (editable)
              </label>
              <div className="space-y-2">
                {sprintNames.map((sn, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={sn}
                      onChange={(e) => {
                        const copy = [...sprintNames];
                        copy[idx] = e.target.value;
                        setSprintNames(copy);
                      }}
                      className="mt-1 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                    <button
                      onClick={() => {
                        setSprintNames((prev) =>
                          prev.filter((_, i) => i !== idx),
                        );
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      aria-label={`Remove weekly sprint ${idx + 1}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div>
                  <button
                    onClick={() =>
                      setSprintNames((prev) => [
                        ...prev,
                        `Weekly Sprint ${prev.length + 1}`,
                      ])
                    }
                    className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    + Add Weekly Sprint
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={loading}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${loading ? "bg-emerald-600 opacity-60 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
