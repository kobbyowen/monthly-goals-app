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

    const originalCount = Array.isArray(payload.sprints) ? payload.sprints.length : 0;
    const filtered = (payload.sprints || []).filter((s: any) => !isSprintPast(s.endAt));
    if (filtered.length !== originalCount) {
        console.log(`submitGoalsForEpic - filtered out ${originalCount - filtered.length} past sprint(s)`);
    }
    // if no active sprints remain, abort submission
    if (filtered.length === 0) {
        throw new Error("All generated sprints are in the past — nothing to submit. Please adjust the epic month or add a future sprint.");
    }
    const payloadToPost = { ...payload, sprints: filtered };

    // log payload
    console.log("submitGoalsForEpic - payload to POST:", JSON.stringify(payloadToPost, null, 2));

    // call the API
    const created = await createPlan(payloadToPost as any);

    // return the API response (created epic)
    return created;
}

export default submitGoalsForEpic;
