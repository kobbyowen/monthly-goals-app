"use client";
import Link from "next/link";
import React from "react";
import { confirmDialog, toast } from "@lib/ui";
import { deleteEpic } from "@lib/api/epics";
import { deleteSprint } from "@lib/api/sprints";
import Popover, { PopoverButton, PopoverPanel } from "./Popover";
import { useRouter, usePathname } from "next/navigation";
import { useRootEpicStore } from "@stores";
import { withBase } from "../lib/api";

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

export default function EpicItem({
  id,
  name,
  activeId,
  onSelect,
  closeOnSelect = false,
  onClose,
}: {
  id: string;
  name: string;
  activeId?: string | null;
  onSelect?: (id: string) => void;
  closeOnSelect?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const removeEpicFromStore = useRootEpicStore.getState().removeEpic;
  const removeSprintFromStore = useRootEpicStore.getState().removeSprint;
  const getSprintsByEpic = useRootEpicStore.getState().getSprintsByEpic;

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (
      !(await confirmDialog(
        "Delete this epic and all of its sprints and tasks?",
      ))
    )
      return;
    try {
      await deleteEpic(id);
      // remove from local store
      try {
        removeEpicFromStore(id);
      } catch (err) {}
      toast("Epic deleted", "success");
      // if currently viewing this epic, navigate home
      if (pathname?.startsWith(`/epics/${id}`)) router.push("/");
    } catch (err) {
      console.error(err);
      toast("Could not delete epic", "error");
    }
  }

  async function handleDeleteSprint(e: React.MouseEvent, sprintId: string) {
    e.stopPropagation();
    if (!(await confirmDialog("Delete this sprint and its tasks?"))) return;
    try {
      await deleteSprint(sprintId);
      try {
        removeSprintFromStore(sprintId);
      } catch (err) {}
      toast("Sprint deleted", "success");
    } catch (err) {
      console.error(err);
      toast("Could not delete sprint", "error");
    }
  }

  return (
    <div
      className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 rounded cursor-pointer text-sm ${
        activeId === id
          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-100"
          : "hover:bg-gray-50 dark:hover:bg-gray-900"
      }`}
    >
      <Link
        href={withBase(`/epics/${id}`)}
        onClick={() => {
          onSelect?.(id);
          if (closeOnSelect) onClose?.();
        }}
        className="flex items-center gap-2 flex-1"
      >
        <IconSprint />
        <span className="truncate">{name}</span>
      </Link>

      <div className="relative">
        {/* Use Popover to handle outside click and single-open behaviour */}
        <Popover>
          <PopoverButton>
            <button
              aria-label="open epic menu"
              className="p-1 rounded hover:bg-muted"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 21a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </PopoverButton>

          <PopoverPanel className="absolute right-0 z-50 mt-2">
            <div className="w-64 rounded-lg border border-border bg-card text-card-foreground">
              <div className="border-b border-border p-2">
                <button
                  onClick={handleDelete}
                  className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-muted"
                >
                  Delete Epic
                </button>
              </div>

              <div className="p-2 space-y-1">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Sprints
                </p>

                <div className="space-y-1 max-h-44 overflow-auto">
                  {getSprintsByEpic(id).length ? (
                    getSprintsByEpic(id).map((sp) => (
                      <div
                        key={sp.id}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted"
                      >
                        <span className="text-foreground truncate">
                          {sp.name || sp.sprintLabel || "Sprint"}
                        </span>
                        <button
                          onClick={(e) => handleDeleteSprint(e as any, sp.id)}
                          className="text-rose-500 hover:text-rose-600"
                          title="Delete sprint"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="px-2 py-2 text-xs text-muted-foreground">
                      No sprints
                    </div>
                  )}
                </div>
              </div>
            </div>
          </PopoverPanel>
        </Popover>
      </div>
    </div>
  );
}
