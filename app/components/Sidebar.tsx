"use client";
import React, { useState } from "react";
import Link from "next/link";
import CreateEpic from "./CreateEpic";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "../hooks/useEpics";

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
  const { data: user } = useSWR("/api/me", fetcher);

  const currentEpics = (sprints || []).filter((e: any) =>
    e ? !e.dateEnded && e.status !== "completed" : false,
  );
  const pastEpics = (sprints || []).filter((e: any) =>
    e ? !!e.dateEnded || e.status === "completed" : false,
  );

  const renderBody = (closeOnSelect: boolean) => (
    <>
      <div className="mb-6 flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold">
          SA
        </div>
        <div>
          <div className="text-sm font-semibold">Sprint App</div>
          <div className="text-xs text-gray-500">Tracker & Timer</div>
        </div>
      </div>

      <nav className="mb-6">
        <Link
          href="/"
          className="flex items-center gap-3 w-full text-left px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
        >
          <IconDashboard />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/analytics"
          className="flex items-center gap-3 w-full text-left px-3 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
        >
          <IconAnalytics />
          <span>Analytics</span>
        </Link>
      </nav>

      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase text-gray-400 mb-2">
            Current Monthly Epics
          </div>
          <ul className="space-y-1">
            {currentEpics.length ? (
              currentEpics.map((ep: any) => (
                <li key={ep.id}>
                  <Link
                    href={`/epics/${ep.id}`}
                    onClick={() => {
                      onSelect?.(ep.id);
                      if (closeOnSelect) setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded cursor-pointer text-sm ${
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
          <ul className="space-y-1">
            {pastEpics.length ? (
              pastEpics.map((ep: any) => (
                <li key={ep.id}>
                  <Link
                    href={`/epics/${ep.id}`}
                    onClick={() => {
                      onSelect?.(ep.id);
                      if (closeOnSelect) setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded cursor-pointer text-sm ${
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
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col bg-white dark:bg-[#0b0b0b] dark:border-gray-800 border-r border-gray-100 p-4 w-72">
        <div className="flex-1 overflow-y-auto">{renderBody(false)}</div>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 flex items-center justify-between">
          <div className="truncate">
            <div className="text-sm font-medium">
              {user?.name || "Signed in"}
            </div>
            <div className="text-xs text-gray-400">{user?.email || ""}</div>
          </div>
          <button
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", { method: "POST" });
              } catch (e) {}
              router.push("/auth/login");
            }}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile slide-in sidebar */}
      {open && (
        <aside className="md:hidden fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#0b0b0b] dark:border-gray-800 border-r border-gray-100 p-4 shadow-xl">
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

          <div className="overflow-y-auto">{renderBody(true)}</div>
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
                  await fetch("/api/auth/logout", { method: "POST" });
                } catch (e) {}
                router.push("/auth/login");
                setOpen(false);
              }}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </aside>
      )}

      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed bottom-6 left-4 z-30 bg-indigo-600 text-white p-3 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="open sidebar"
      >
        ☰
      </button>
    </>
  );
}
