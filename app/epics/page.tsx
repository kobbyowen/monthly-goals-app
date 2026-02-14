"use client";

import SprintList from "@components/SprintList";
import Sidebar from "@components/Sidebar";
import CreateEpic from "@components/CreateEpic";
import { useRootEpicStore } from "@stores";
import { useShallow } from "zustand/shallow";

export default function Page() {
  const epics = useRootEpicStore(
    useShallow((s) => s.epics.allIds.map((id) => s.epics.byId[id])),
  );

  const sprintsForView = useRootEpicStore(
    useShallow((s) =>
      s.sprints.allIds.map((id) => {
        const sp = s.sprints.byId[id];
        const tasks = (sp.taskIds || [])
          .map((tid) => s.tasks.byId[tid])
          .filter(Boolean);
        return {
          id: sp.id,
          name: sp.name,
          sprintLabel: sp.sprintLabel,
          start: sp.start ?? "",
          end: sp.end ?? "",
          tasks,
        } as any;
      }),
    ),
  );

  const sprintView = sprintsForView.map((e) => ({
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
