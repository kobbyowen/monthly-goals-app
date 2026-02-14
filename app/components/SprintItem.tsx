"use client";

import React, { useMemo, useState } from "react";
import { useRootEpicStore } from "../stores";
import { useShallow } from "zustand/shallow";
import AddTaskModal from "./AddTaskModal";
import TaskCard from "./TaskCard";

export default function SprintItem({ sprintId }: { sprintId: string }) {
  const [
    sprint,
    tasksBySprint,
    getSessionsByTask,
    getChecklistsByTask,
    addTask,
    updateSprint,
  ] = useRootEpicStore(
    useShallow((s) => [
      s.sprints.byId[sprintId],
      s.getTasksBySprint(sprintId),
      s.getSessionsByTask,
      s.getChecklistsByTask,
      s.addTask,
      s.updateSprint,
    ]),
  );

  const [adding, setAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    // default collapsed if sprint already completed
    try {
      const tasks = (tasksBySprint || []) as any[];
      const total = tasks.length;
      const completed = tasks.filter((t) => t.completed).length;
      return total > 0 && completed === total;
    } catch (e) {
      return false;
    }
  });
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = React.useState<string>(
    collapsed ? "0px" : "0px",
  );

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (collapsed) {
      // collapse
      setMaxHeight("0px");
    } else {
      // expand to measured height
      const h = el.scrollHeight;
      setMaxHeight(`${h}px`);
      // after the transition, remove the max-height constraint
      const t = setTimeout(() => setMaxHeight("none"), 350);
      return () => clearTimeout(t);
    }
  }, [collapsed, tasksBySprint]);

  if (!sprint) return null;

  /* -------------------------
     Group Tasks
  -------------------------- */

  const grouped = useMemo(() => {
    const todo: string[] = [];
    const running: string[] = [];
    const completed: string[] = [];

    tasksBySprint.forEach((task) => {
      if (task.completed) {
        completed.push(task.id);
      } else {
        // determine running by checking sessions for this task
        const sessions = getSessionsByTask(task.id) ?? [];
        const isRunning = sessions.some((s) => !s.endedAt);
        if (isRunning) {
          running.push(task.id);
        } else {
          todo.push(task.id);
        }
      }
    });

    return { todo, running, completed };
  }, [tasksBySprint, getSessionsByTask]);

  const totalTasks =
    grouped.todo.length + grouped.running.length + grouped.completed.length;

  const completedCount = grouped.completed.length;

  const progress =
    totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const plannedHours = useMemo(() => {
    const totalSeconds = tasksBySprint.reduce(
      (acc, t) => acc + (t.plannedTime ?? 0),
      0,
    );
    if (!totalSeconds) return undefined;
    return Math.round(totalSeconds / 3600);
  }, [tasksBySprint]);

  const { checklistTotal, checklistCompleted } = useMemo(() => {
    try {
      const totals = tasksBySprint.reduce(
        (acc, t) => {
          const items = getChecklistsByTask(t.id) || [];
          acc.total += items.length;
          acc.completed += items.filter((c) => c.done).length;
          return acc;
        },
        { total: 0, completed: 0 },
      );
      return {
        checklistTotal: totals.total,
        checklistCompleted: totals.completed,
      };
    } catch (e) {
      return { checklistTotal: 0, checklistCompleted: 0 };
    }
  }, [tasksBySprint, getChecklistsByTask]);

  /* -------------------------
     Sprint Status
  -------------------------- */

  const status =
    progress === 100
      ? "completed"
      : grouped.running.length > 0
        ? "running"
        : "todo";

  const statusStyles = {
    todo: "bg-gray-100 text-gray-700",
    running: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
  }[status];

  const statusLabel =
    status === "running"
      ? "In Progress"
      : status === "completed"
        ? "Completed"
        : "To Do";

  function handleAdd() {
    setShowAddModal(true);
  }

  return (
    <div className="max-w-6xl mx-0 p-0 md:p-4 mb-6 md:mb-4">
      {/* Sprint Card */}
      <section
        className={`bg-transparent rounded-none ${collapsed ? "px-0 pt-0 pb-0 md:px-4 md:pt-4" : "p-0 md:p-4"} space-y-3 md:space-y-4`}
      >
        {/* Header (click anywhere to toggle collapse) */}
        <div
          className="flex flex-col items-center md:flex-row md:items-center md:justify-between gap-3 md:gap-4 cursor-pointer"
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setCollapsed((c) => !c);
          }}
        >
          <div className="space-y-2 text-center md:text-left md:pl-6">
            <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
              <h2 className="text-xl font-semibold text-gray-900">
                {sprint.name}
              </h2>

              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${statusStyles}`}
              >
                {statusLabel}
              </span>

              <span className="text-xs text-gray-400 ml-2">
                {collapsed ? "▸" : "▾"}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${status === "completed" ? "bg-green-600" : "bg-indigo-600"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats (stop header toggle when interacting with controls) */}
          <div
            className="flex items-center gap-6 md:gap-4 text-sm text-gray-600 w-full md:w-auto justify-center md:justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <p
                className={`text-sm font-semibold ${progress === 100 ? "text-green-600" : progress === 0 ? "text-gray-400" : "text-indigo-600"}`}
              >
                {progress}%
              </p>
              <p className="text-xs text-gray-400">Progress</p>
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">{`${checklistCompleted} / ${checklistTotal}`}</p>
              <p className="text-xs text-gray-400">Checklist</p>
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">
                {totalTasks}
              </p>
              <p className="text-xs text-gray-400">Tasks</p>
            </div>

            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdd();
                }}
                disabled={adding}
                className={`hidden md:inline-flex px-4 py-2 text-sm font-medium rounded-lg transition ${adding ? "bg-indigo-300 text-white cursor-wait" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
              >
                {adding ? "Adding…" : "Add Task"}
              </button>
              {showAddModal && (
                <AddTaskModal
                  sprintId={sprintId}
                  onClose={() => setShowAddModal(false)}
                />
              )}
            </>
          </div>
        </div>

        {/* Mobile action row for Add Task */}
        <div className="md:hidden mt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }}
            disabled={adding}
            className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition ${adding ? "bg-indigo-300 text-white cursor-wait" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
          >
            {adding ? "Adding…" : "Add Task"}
          </button>
          {showAddModal && (
            <AddTaskModal
              sprintId={sprintId}
              onClose={() => setShowAddModal(false)}
            />
          )}
        </div>

        {/* Columns (collapsible with animation) */}
        <div
          ref={contentRef}
          style={{
            maxHeight: maxHeight,
            opacity: collapsed ? 0 : 1,
            overflow: "hidden",
            transition: "max-height 320ms ease, opacity 220ms ease",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {/* To Do */}
            <div className="bg-transparent md:bg-gray-50 rounded-none md:rounded-xl p-0 md:p-4 space-y-3 md:space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">To Do</h3>
                <span className="text-xs text-gray-400">
                  {grouped.todo.length}
                </span>
              </div>

              {grouped.todo.map((id) => (
                <TaskCard key={id} taskId={id} />
              ))}
            </div>

            {/* In Progress */}
            <div className="bg-transparent md:bg-gray-50 rounded-none md:rounded-xl p-0 md:p-4 space-y-3 md:space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">
                  In Progress
                </h3>
                <span className="text-xs text-gray-400">
                  {grouped.running.length}
                </span>
              </div>

              {grouped.running.map((id) => (
                <TaskCard key={id} taskId={id} />
              ))}
            </div>

            {/* Done */}
            <div className="bg-transparent md:bg-gray-50 rounded-none md:rounded-xl p-0 md:p-4 space-y-3 md:space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Done</h3>
                <span className="text-xs text-gray-400">
                  {grouped.completed.length}
                </span>
              </div>

              {grouped.completed.map((id) => (
                <TaskCard key={id} taskId={id} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
