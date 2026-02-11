"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import CreateEpic from "./CreateEpic";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "../hooks/useEpics";
import { withBase } from "../lib/api";

function IconDashboard() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconAnalytics() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 3v18h18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 13v4M12 9v8M17 5v12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSprint() {
  return (
    <svg
      className="h-4 w-4 inline-block mr-2"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 12h14M12 5v14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Sidebar({
  sprints = [],
  onSelect,
  activeId,
  onCreated,
}: {
  sprints?: any[];
  onSelect?: (id: string) => void;
  activeId?: string;
  onCreated?: (epic: any) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(true);
    if (typeof window !== "undefined") {
      window.addEventListener("openSidebar", handler);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("openSidebar", handler);
      }
    };
  }, []);
  const { data: user } = useSWR(withBase("/api/me"), fetcher);
  const [now, setNow] = React.useState(() => new Date());
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  // Refresh `now` at midnight so current/future/past epic grouping updates
  React.useEffect(() => {
    const msUntilMidnight = () => {
      const d = new Date();
      const tomorrow = new Date(d);
      tomorrow.setDate(d.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.getTime() - d.getTime();
    };

    const timer = setTimeout(() => setNow(new Date()), msUntilMidnight());
    return () => clearTimeout(timer);
  }, [now]);

  const epicsWithMonth = (sprints || []).map((e: any) => {
    const y = typeof e.epicYear === "number" ? e.epicYear : undefined;
    const m = typeof e.epicMonth === "number" ? e.epicMonth : undefined;
    const orderKey = y && m ? y * 12 + m : Number.POSITIVE_INFINITY;
    return { ...e, _epicYear: y, _epicMonth: m, _orderKey: orderKey };
  });

  const withMonth = epicsWithMonth.filter((e) => e._epicYear && e._epicMonth);
  const withoutMonth = epicsWithMonth.filter(
    (e) => !e._epicYear || !e._epicMonth,
  );

  withMonth.sort((a, b) => (a._orderKey as number) - (b._orderKey as number));

  const currentMonthEpics: any[] = [];
  const futureEpics: any[] = [];
  const pastEpicsWithMonth: any[] = [];

  for (const e of withMonth) {
    const y = e._epicYear as number;
    const m = e._epicMonth as number;
    if (y < curYear || (y === curYear && m < curMonth)) {
      pastEpicsWithMonth.push(e);
    } else if (y === curYear && m === curMonth) {
      currentMonthEpics.push(e);
    } else {
      futureEpics.push(e);
    }
  }

  const fallbackCurrent = withoutMonth.filter((e) =>
    e ? !e.dateEnded && e.status !== "completed" : false,
  );
  const fallbackPast = withoutMonth.filter((e) =>
    e ? !!e.dateEnded || e.status === "completed" : false,
  );

  const currentEpics = [
    ...currentMonthEpics,
    ...futureEpics,
    ...fallbackCurrent,
  ];
  const pastEpics = [...pastEpicsWithMonth, ...fallbackPast];

  const renderBody = (closeOnSelect: boolean) => (
    <>
      <div className="mb-8 flex items-center gap-3 hidden md:flex">
        <div className="h-10 w-10 rounded-md bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold">
          SA
        </div>
        <div>
          <div className="text-sm font-semibold">Monthly Goals Planner</div>
          <div className="text-xs text-gray-500">
            Monthly epics & weekly sprints
          </div>
        </div>
      </div>

      <nav className="mb-8">
        <Link
          href={withBase("/")}
          className="flex items-center gap-3 w-full text-left px-3 py-4 rounded hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
        >
          <IconDashboard />
          <span>Dashboard</span>
        </Link>
        <Link
          href={withBase("/analytics")}
          className="flex items-center gap-3 w-full text-left px-3 py-4 rounded hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
        >
          <IconAnalytics />
          <span>Analytics</span>
        </Link>
      </nav>

      <div className="space-y-6">
        <div>
          <div className="text-xs font-semibold uppercase text-gray-400 mb-2">
            Current Monthly Epics
          </div>
          <ul className="space-y-3">
            {currentEpics.length ? (
              currentEpics.map((ep: any) => (
                <li key={ep.id}>
                  <Link
                    href={withBase(`/epics/${ep.id}`)}
                    onClick={() => {
                      onSelect?.(ep.id);
                      if (closeOnSelect) setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-4 rounded cursor-pointer text-sm ${
                      activeId === ep.id
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-100"
                        : "hover:bg-gray-50 dark:hover:bg-gray-900"
                    }`}
                  >
                    <IconSprint />
                    <span className="truncate">{ep.name}</span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-xs text-gray-500">
                No current monthly epics
              </li>
            )}
          </ul>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-gray-400 mb-2">
            Past Monthly Epics
          </div>
          <ul className="space-y-3">
            {pastEpics.length ? (
              pastEpics.map((ep: any) => (
                <li key={ep.id}>
                  <Link
                    href={withBase(`/epics/${ep.id}`)}
                    onClick={() => {
                      onSelect?.(ep.id);
                      if (closeOnSelect) setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-4 rounded cursor-pointer text-sm ${
                      activeId === ep.id
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-100"
                        : "hover:bg-gray-50 dark:hover:bg-gray-900"
                    }`}
                  >
                    <IconSprint />
                    <span className="truncate">{ep.name}</span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-xs text-gray-500">No past monthly epics</li>
            )}
          </ul>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
          <CreateEpic onCreated={onCreated} />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar (visible on large screens and up) */}
      <aside className="hidden lg:flex lg:flex-col justify-between bg-white dark:bg-[#0b0b0b] dark:border-gray-800 border-r border-gray-100 p-4 w-72 h-screen">
        <div className="flex-1 overflow-hidden">{renderBody(false)}</div>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 flex items-center justify-between bg-white dark:bg-[#0b0b0b]">
          <div className="truncate">
            <div className="text-sm font-medium">
              {user?.name || "Signed in"}
            </div>
            <div className="text-xs text-gray-400">{user?.email || ""}</div>
          </div>
          <button
            onClick={async () => {
              try {
                await fetch(withBase("/api/auth/logout"), {
                  method: "POST",
                });
              } catch (e) {}
              router.push(withBase("/auth/login"));
            }}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-gray-50 whitespace-nowrap"
          >
            Logout
          </button>
        </div>
      </aside>
      {/* Mobile / tablet slide-in sidebar */}
      {open && (
        <aside className="lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#0b0b0b] dark:border-gray-800 border-r border-gray-100 p-4 shadow-xl flex flex-col justify-between pt-5 h-[100vh]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold">
                SA
              </div>
              <div>
                <div className="text-sm font-semibold">Sprint App</div>
              </div>
            </div>
            <button
              aria-label="close sidebar"
              className="px-2 py-1"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-hidden">{renderBody(true)}</div>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">
                {user?.name || "Signed in"}
              </div>
              <div className="text-xs text-gray-400">{user?.email || ""}</div>
            </div>
            <button
              onClick={async () => {
                try {
                  await fetch(withBase("/api/auth/logout"), {
                    method: "POST",
                  });
                } catch (e) {}
                router.push(withBase("/auth/login"));
                setOpen(false);
              }}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-gray-50 whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </aside>
      )}

      {/* Mobile hamburger is provided by a separate MobileHeader component */}
    </>
  );
}
