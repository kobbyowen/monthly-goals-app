"use client";

import React from "react";
import { useParams } from "next/navigation";
import Sidebar from "@components/Sidebar";
import SprintList from "@components/SprintList";
import EditEpicName from "@components/EditEpicName";
import EpicControls from "@components/EpicControls";
import { useEpics } from "@hooks/useEpics";
import { useEpic } from "@hooks/useEpic";

export default function EpicPage() {
  const params = useParams();
  const idParam = (params as any)?.id;
  const epicId = Array.isArray(idParam) ? idParam[0] : String(idParam || "");

  const { epics } = useEpics();
  const { epic } = useEpic(epicId);
  const sprintView = (epic?.sprints || []).map((s: any) => ({
    ...s,
    name: s.sprintLabel || s.name,
  }));
  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-black">
      <Sidebar sprints={epics} activeId={epicId} />
      <main className="flex-1 h-screen overflow-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="space-y-3">
            <EditEpicName epicId={epicId} name={epic?.name} />
            <EpicControls epicId={epicId} epicName={epic?.name} />
          </div>
          <div className="mt-2">
            {sprintView.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No sprints for this epic yet.
              </p>
            ) : (
              <SprintList sprints={sprintView} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
