"use client";

import React from "react";
import { useParams } from "next/navigation";
import Sidebar from "../../components/Sidebar";
import SprintList from "../../components/SprintList";
import EditEpicName from "../../components/EditEpicName";
import EpicControls from "../../components/EpicControls";
import { useEpics } from "../../hooks/useEpics";
import { useEpic } from "../../hooks/useEpic";

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
      <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <EditEpicName epicId={epicId} name={epic?.name} />
            <EpicControls epicId={epicId} epicName={epic?.name} />
          </div>
          <div className="mt-2">
            <SprintList sprints={sprintView} />
          </div>
        </div>
      </main>
    </div>
  );
}
