"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { withBase } from "../lib/api";
import { toast } from "../lib/ui";

export default function EditEpicName({
  epicId,
  name,
}: {
  epicId: string;
  name?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name || "");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!epicId || !value) return;
    setLoading(true);
    try {
      const res = await fetch(withBase(`/api/epics/${epicId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      if (!res.ok) throw new Error("Failed to update epic");
      setEditing(false);
      // Revalidate shared epics data so sidebars/dashboards update
      mutate(withBase("/api/epics"));
    } catch (err) {
      console.error(err);
      toast("Could not update epic name", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      {!editing ? (
        <h1 className="text-2xl font-semibold truncate max-w-[70%] sm:max-w-none">
          {value || name || "Monthly Epic"}
        </h1>
      ) : (
        <input
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          value={value || name}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      <div className="ml-4">
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Edit
          </button>
        ) : (
          <>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm mr-2"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
