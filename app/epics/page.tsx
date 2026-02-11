"use client";

import SprintList from "../components/SprintList";
import Sidebar from "../components/Sidebar";
import CreateEpic from "../components/CreateEpic";
import { useEpics } from "../hooks/useEpics";

export default function Page() {
  const { epics } = useEpics();
  const sprintView = (epics || []).map((e: any) => ({
    ...e,
    name: e.sprintLabel || e.name,
  }));
  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-black">
      <Sidebar sprints={epics} />
      <main className="flex-1 h-screen overflow-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold">
                Monthly Epics
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Plan and track work across weekly sprints.
              </p>
            </div>
            <CreateEpic />
          </div>

          <SprintList sprints={sprintView} />
        </div>
      </main>
    </div>
  );
}
