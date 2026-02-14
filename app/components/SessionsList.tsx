"use client";

import React from "react";
import SessionItem from "./SessionItem";
import { Session as StoreSession } from "../stores/types";

type Props = {
  sessions?: StoreSession[];
};

export default function SessionsList({ sessions = [] }: Props) {
  if (!sessions.length) {
    return <div className="text-sm text-gray-400 py-4">No sessions yet.</div>;
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  return (
    <div className="space-y-3">
      {sorted.map((session) => (
        <SessionItem key={session.id} session={session} />
      ))}
    </div>
  );
}
