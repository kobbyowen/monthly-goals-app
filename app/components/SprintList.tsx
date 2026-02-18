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
    return <p className="text-sm text-muted-foreground italic">No sprints.</p>;
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {effective.map((sp) => (
          <div key={sp.id} className="py-4">
            <SprintItem sprintId={sp.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
