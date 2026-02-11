"use client";

import React from "react";

type Toast = {
  id: string;
  message: string;
  type?: "info" | "success" | "error";
};

export default function ToastProvider() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    function onToast(e: any) {
      const detail = e?.detail || {};
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const t: Toast = {
        id,
        message: detail.message || String(detail),
        type: detail.type || "info",
      };
      setToasts((s) => [...s, t]);
      const ttl = typeof detail.ttl === "number" ? detail.ttl : 4000;
      setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), ttl);
    }

    window.addEventListener("app:toast", onToast as EventListener);
    return () =>
      window.removeEventListener("app:toast", onToast as EventListener);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-end justify-center p-4 md:items-end md:justify-end">
      <div className="w-full max-w-md space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full rounded-lg px-4 py-3 shadow-md text-sm ${t.type === "error" ? "bg-rose-600 text-white" : t.type === "success" ? "bg-emerald-600 text-white" : "bg-white text-slate-900"}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
