"use client";
import React from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import { useEpics, fetcher } from "./hooks/useEpics";
import useSWR from "swr";
import { withBase } from "./lib/api";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  // Check if the user is authenticated before showing the dashboard
  const {
    data: me,
    error: meError,
    isLoading: meLoading,
  } = useSWR(withBase("/api/me"), fetcher);

  React.useEffect(() => {
    if (meError) {
      router.replace(withBase("/auth/login"));
    }
  }, [meError, router]);

  const { epics, mutate } = useEpics();

  // While we don't yet know if the user is logged in, avoid flashing the dashboard
  if (meLoading && !me && !meError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-black">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Loading your workspace...
        </div>
      </div>
    );
  }

  // If unauthenticated, the effect above will navigate away; render nothing here
  if (meError) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-slate-100 dark:bg-black">
      <Sidebar
        sprints={epics}
        onCreated={(created) =>
          mutate((prev: any[] | undefined) => [created, ...(prev || [])], false)
        }
      />
      <main className="flex-1 h-screen overflow-auto px-4 py-4 sm:px-6 lg:px-8">
        <Dashboard epics={epics} />
      </main>
    </div>
  );
}
