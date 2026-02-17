import createStructuredPlan from "../../utils/createStructuredPlan";
import { createPlan } from "./wizard";

export async function submitGoalsForEpic(wizardData: any) {
    // convert wizard data into the API-shaped payload
    const payload = createStructuredPlan(wizardData);

    // remove sprints that have already ended (past sprints)
    function isSprintPast(endAt: string | null | undefined) {
        if (!endAt) return false;
        try {
            const d = new Date(endAt);
            d.setHours(23, 59, 59, 999);
            return d.getTime() < Date.now();
        } catch {
            return false;
        }
    }

    const allSprints = (payload.sprints || []);
    const filtered = allSprints.filter((s: any) => !isSprintPast(s.endAt));

    // if no active sprints remain, abort submission
    if (filtered.length === 0) {
        throw new Error("All generated sprints are in the past — nothing to submit. Please adjust the epic month or add a future sprint.");
    }

    // If some sprints were removed for being past, reassign their tasks into the last active sprint
    if (filtered.length < allSprints.length) {
        const removed = allSprints.filter((s: any) => isSprintPast(s.endAt));
        const droppedTasks: any[] = [];
        for (const r of removed) {
            if (Array.isArray(r.tasks)) droppedTasks.push(...r.tasks);
        }
        if (droppedTasks.length > 0) {
            // append dropped tasks to last active sprint
            const last = filtered[filtered.length - 1];
            last.tasks = last.tasks ? last.tasks.concat(droppedTasks) : droppedTasks.slice();
        }
    }

    const payloadToPost = { ...payload, sprints: filtered };

    // call the API
    const created = await createPlan(payloadToPost as any);

    // return the API response (created epic)
    return created;
}

export default submitGoalsForEpic;
