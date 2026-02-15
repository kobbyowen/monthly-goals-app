"use client";

import React, { useEffect, useState } from "react";
import { useEpics } from "../hooks/useEpics";
import { useRootEpicStore } from "../stores";
import { useShallow } from "zustand/shallow";
import SprintItem from "./SprintItem";

type Sprint = { id: string };

export default function SprintList({ sprints }: { sprints?: Sprint[] } = {}) {
  const { epics } = useEpics();

  // Subscribe to store helper and sprints list so we re-run when sprints change
  const [getSprintsByEpic, _sprintIds] = useRootEpicStore(
    useShallow((s) => [s.getSprintsByEpic, s.sprints.allIds]),
  );

  const [effective, setEffective] = useState<Sprint[]>(() => sprints || []);

  useEffect(() => {
    if (sprints && sprints.length) {
      setEffective(sprints);
      return;
    }

    // choose selected epic as the first epic (pages manage selection elsewhere)
    const epicId = epics && epics.length ? epics[0].id : null;
    if (!epicId) {
      setEffective([]);
      return;
    }

    const found = getSprintsByEpic(epicId) || [];
    setEffective(found.map((s: any) => ({ id: s.id })));
  }, [sprints, epics, getSprintsByEpic, _sprintIds]);

  if (!effective || effective.length === 0) {
    return <p className="text-sm text-slate-500 italic">No sprints.</p>;
  }

  return (
    <div>
      <div className="max-w-6xl mx-0 p-0 md:p-4 mb-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase text-center">
          SPRINTS
        </h3>
        <div className="mt-2 h-[1px] bg-slate-200 w-full" />
      </div>

      <div className="divide-y divide-slate-200">
        {effective.map((sp) => (
          <div key={sp.id} className="py-4">
            <SprintItem sprintId={sp.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
