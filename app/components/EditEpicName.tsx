"use client";
import React from "react";

export default function EditEpicName({
  epicId,
  name,
}: {
  epicId: string;
  name?: string;
}) {
  function openEpicSettings() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("openEpicSettings", { detail: { epicId } }),
      );
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold truncate max-w-[70%] sm:max-w-none">
        {name || "Monthly Epic"}
      </h1>
      <div className="ml-4">
        <button
          onClick={openEpicSettings}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
