"use client";

import React from "react";
import { useParams } from "next/navigation";
import Sidebar from "@components/Sidebar";
import SprintList from "@components/SprintList";
import EpicHeader from "@components/EpicHeader";
import { useRootEpicStore, Sprint } from "@stores";
import { useShallow } from "zustand/shallow";

export default function EpicPage() {
  const params = useParams();
  const rawId = (params as { id?: string | string[] })?.id;
  const epicId = Array.isArray(rawId) ? rawId[0] : String(rawId || "");

  const epics = useRootEpicStore(
    useShallow((s) => s.epics.allIds.map((id) => s.epics.byId[id])),
  );
  const epic = useRootEpicStore(
    useShallow((s) => s.epics.byId[epicId] ?? null),
  );
  const sprintView: Sprint[] = useRootEpicStore(
    useShallow((s) => s.getSprintsByEpic(epicId)),
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-black">
      <Sidebar sprints={epics} activeId={epicId} />
      <main className="flex-1 h-screen overflow-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-0 max-w-6xl space-y-4">
          <EpicHeader epicId={epicId} />
          <div className="mt-2">
            {sprintView.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No sprints for this epic yet.
              </p>
            ) : (
              <div>
                {/* <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Sprints
                </h2> */}
                <SprintList sprints={sprintView} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
