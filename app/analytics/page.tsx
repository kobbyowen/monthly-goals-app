"use client";

import Sidebar from "@components/Sidebar";
import { useEpics } from "@hooks/useEpics";

export default function AnalyticsPage() {
  const { epics } = useEpics();
  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-black">
      <Sidebar sprints={epics} />
      <main className="flex-1 h-screen overflow-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl py-10 sm:py-16 text-center space-y-4">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            Analytics
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Monthly Epic analytics coming soon
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
            We&apos;re working on rich charts and insights for how your team
            spends time across monthly epics, weekly sprints, and tasks. Stay
            tuned.
          </p>
        </div>
      </main>
    </div>
  );
}
