"use client";

import React from "react";

export default function ConfirmProvider() {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [confirmLabel, setConfirmLabel] = React.useState("Delete");
  const resolverRef = React.useRef<((v: boolean) => void) | null>(null);

  React.useEffect(() => {
    function onConfirm(e: any) {
      const detail = e?.detail || {};
      setMessage(detail.message || "Are you sure?");
      resolverRef.current = detail.resolve || null;
      setConfirmLabel(detail.confirmLabel || "Delete");
      setOpen(true);
    }

    window.addEventListener("app:confirm", onConfirm as EventListener);
    return () =>
      window.removeEventListener("app:confirm", onConfirm as EventListener);
  }, []);

  function doClose(result: boolean) {
    setOpen(false);
    const r = resolverRef.current;
    resolverRef.current = null;
    if (typeof r === "function") r(result);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => doClose(false)}
      />
      <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <div className="text-sm text-slate-900">{message}</div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => doClose(false)}
            className="rounded-lg border border-slate-300 px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={() => doClose(true)}
            className={`rounded-lg px-3 py-1.5 text-white ${
              confirmLabel &&
              String(confirmLabel).toLowerCase().includes("delete")
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
