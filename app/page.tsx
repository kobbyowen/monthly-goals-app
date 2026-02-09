"use client";
import React from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import { useEpics } from "./hooks/useEpics";

export default function Home() {
  const { epics, mutate } = useEpics();

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-black">
      <Sidebar
        sprints={epics}
        onCreated={(created: any) =>
          mutate((prev: any[] | undefined) => [created, ...(prev || [])], false)
        }
      />
      <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <Dashboard epics={epics} />
      </main>
    </div>
  );
}
