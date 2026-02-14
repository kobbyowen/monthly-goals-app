import { createTask as apiCreateTask } from "@api/tasks";

type StoreHelpers = {
    addTask: (t: any) => void;
    updateSprint: (id: string, patch: any) => void;
};

/**
 * Create a task for a sprint (API -> store).
 * Keeps the logic in one place so callers can just prompt and pass store helpers.
 */
export async function createTaskForSprint(
    sprintId: string,
    title: string,
    helpers: StoreHelpers,
    currentSprint?: { taskIds?: string[] },
) {
    const created = await apiCreateTask({ sprintId, title });
    helpers.addTask(created as any);
    // ensure sprint.taskIds contains the new task id
    helpers.updateSprint(sprintId, { taskIds: [...(currentSprint?.taskIds || []), created.id] } as any);
    return created;
}

export async function promptCreateTaskForSprint(
    sprintId: string,
    helpers: StoreHelpers,
    currentSprint?: { taskIds?: string[] },
) {
    const title = window.prompt("Task title", "New task")?.trim();
    if (!title) return null;
    return createTaskForSprint(sprintId, title.slice(0, 128), helpers, currentSprint);
}
