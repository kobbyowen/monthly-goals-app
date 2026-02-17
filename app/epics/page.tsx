"use client";

import React from "react";
import SprintList from "@components/SprintList";
import Sidebar from "@components/Sidebar";
import CreateEpic from "@components/CreateEpic";
import WizardModal from "@components/WizardModal";
import { useRootEpicStore } from "@stores";
import { useShallow } from "zustand/shallow";

export default function Page() {
  const { epicsAllIds, epicsById, sprintsAllIds, sprintsById, tasksById } =
    useRootEpicStore(
      useShallow((s) => ({
        epicsAllIds: s.epics.allIds,
        epicsById: s.epics.byId,
        sprintsAllIds: s.sprints.allIds,
        sprintsById: s.sprints.byId,
        tasksById: s.tasks.byId,
      })),
    );

  const epics = React.useMemo(
    () => (epicsAllIds || []).map((id) => epicsById[id]).filter(Boolean),
    [epicsAllIds, epicsById],
  );

  const sprintsForView = React.useMemo(() => {
    return (sprintsAllIds || [])
      .map((id) => {
        const sp = sprintsById[id];
        if (!sp) return null;
        const tasks = (sp.taskIds || [])
          .map((tid) => tasksById[tid])
          .filter(Boolean);
        return {
          id: sp.id,
          name: sp.name,
          sprintLabel: sp.sprintLabel,
          start: sp.start ?? "",
          end: sp.end ?? "",
          tasks,
        } as any;
      })
      .filter(Boolean);
  }, [sprintsAllIds, sprintsById, tasksById]);

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
                Plan and track goals across weekly sprints.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:w-auto">
                <WizardModalWrapper />
              </div>
              <div className="w-full sm:w-auto">
                <CreateEpic />
              </div>
            </div>
          </div>

          <SprintList sprints={sprintView} />
        </div>
      </main>
    </div>
  );
}

function WizardModalWrapper() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full justify-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 transition"
      >
        New Monthly Epic From Goals
      </button>
      <WizardModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => setOpen(false)}
      />
    </>
  );
}
