"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import TodoItemsList from "../components/TodoItemsList";
import TodoEmptyDay from "../components/TodoEmptyDay";
import GenerateTodosModal from "../components/GenerateTodosModal";
import dynamic from "next/dynamic";
const AddNewTodoModal = dynamic(() => import("../components/AddNewTodoModal"), {
  ssr: false,
});
import useRootEpicStore from "@stores/rootEpicStore";
import { useShallow } from "zustand/shallow";
import { getEpics } from "@lib/api";
import type { Epic } from "@lib/api/types";

export default function Page() {
  const [query, setQuery] = useState("");
  const epics = useRootEpicStore(
    useShallow((s) => s.epics.allIds.map((id) => s.epics.byId[id])),
  );
  const todos = useRootEpicStore(
    useShallow((s) => s.todos.allIds.map((id) => s.todos.byId[id])),
  );

  // ensure stable client rendering
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ensure we have the latest epics (and any todoTasks) in the store
  useEffect(() => {
    if (!mounted) return;
    if ((todos || []).length > 0) return; // already have todos
    let mountedFlag = true;
    void getEpics()
      .then((epics) => {
        if (!mountedFlag) return;
        try {
          useRootEpicStore.getState().addEpicsFromApi(epics);
        } catch (e) {}
      })
      .catch(() => {});
    return () => {
      mountedFlag = false;
    };
  }, [mounted, todos]);

  const [openGenerate, setOpenGenerate] = useState(false);
  const [openAddTodo, setOpenAddTodo] = useState(false);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (!mounted) return null;
  return (
    <div className="min-h-screen flex bg-white dark:bg-[#050505]">
      <Sidebar sprints={epics as Epic[]} />

      <main className="flex-1 h-screen overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-4 pb-3 border-b border-border flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">My Day</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenAddTodo(true)}
                className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Add New Todo
              </button>
              <input
                aria-label="Search todos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="text-sm w-24 sm:w-40 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground px-2 py-1"
              />
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Group todos by date: Today / Yesterday / Older */}
            {(() => {
              const byDate = (td: any) => {
                const dateStr = td.dueDate ?? td.createdAt ?? undefined;
                if (!dateStr) return null;
                const d = new Date(dateStr);
                return d.toDateString();
              };

              const today = new Date().toDateString();
              const yesterday = new Date(
                Date.now() - 24 * 60 * 60 * 1000,
              ).toDateString();

              const allTodos = (todos ||
                []) as unknown as import("@lib/api/types").Todo[];

              const todayTodos = allTodos.filter((t) => byDate(t) === today);
              const yesterdayTodos = allTodos.filter(
                (t) => byDate(t) === yesterday,
              );
              const olderTodos = allTodos.filter((t) => {
                const d = byDate(t);
                return d !== today && d !== yesterday;
              });

              return (
                <>
                  {todayTodos.length === 0 ? (
                    <TodoEmptyDay
                      title="Today"
                      dateLabel={todayLabel}
                      onGenerate={() => setOpenGenerate(true)}
                    />
                  ) : (
                    <section className="mb-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          Today
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {todayLabel}
                        </span>
                      </div>
                      <TodoItemsList todos={todayTodos} />
                    </section>
                  )}

                  {yesterdayTodos.length > 0 && (
                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          Yesterday
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(
                            Date.now() - 24 * 60 * 60 * 1000,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <TodoItemsList todos={yesterdayTodos} />
                    </section>
                  )}

                  {olderTodos.length > 0 && (
                    <section>
                      <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          Older
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {olderTodos.length} items
                        </span>
                      </div>
                      <TodoItemsList todos={olderTodos} />
                    </section>
                  )}
                </>
              );
            })()}

            <GenerateTodosModal
              open={openGenerate}
              onClose={() => setOpenGenerate(false)}
              onCreated={() => {}}
            />
            {openAddTodo ? (
              // lazy load modal component
              //@ts-ignore
              <AddNewTodoModal onClose={() => setOpenAddTodo(false)} />
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
