import createStructuredPlan from "../../utils/createStructuredPlan";
import { createPlan } from "./wizard";

export async function submitGoalsForEpic(wizardData: any) {
    // convert wizard data into the API-shaped payload
    const payload = createStructuredPlan(wizardData);

    // log payload
     
    console.log("submitGoalsForEpic - payload to POST:", JSON.stringify(payload, null, 2));

    // call the API
    const created = await createPlan(payload as any);

    // return the API response (created epic)
    return created;
}

export default submitGoalsForEpic;
