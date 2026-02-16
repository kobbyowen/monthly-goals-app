export function createStructuredPlan(wizardData: any) {
    const {
        capacity = {},
        goals = [],
        generatedPlanPreview = { epic: {}, sprints: [] },
    } = wizardData || {};

    const weeklyLimit = capacity.weeklyCommitmentHours || 0;
    const epic = generatedPlanPreview.epic || {};
    const sprintsSrc = generatedPlanPreview.sprints || [];
    const numSprints = Math.max(1, sprintsSrc.length);

    const rndId = (prefix = "id") =>
        `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

    // initialize sprint containers. If preview provided per-sprint hours, use that
    const sprints = sprintsSrc.map((s: any, idx: number) => {
        const cap = typeof s.hours === 'number' && s.hours >= 0 ? Number(s.hours) : weeklyLimit;
        return {
            id: `spr_${String(idx + 1).padStart(3, "0")}`,
            name: s.name || s.name,
            startAt: s.startDate || s.startAt || null,
            endAt: s.endDate || s.endAt || null,
            weeklyCapacity: cap,
            remainingHours: cap,
            tasks: [] as any[],
        };
    });

    // split goals by frequency
    const weeklyGoals = goals.filter(
        (g: any) => (g.effort || {}).effortFrequency === "weekly"
    );
    const monthlyGoals = goals.filter(
        (g: any) => (g.effort || {}).effortFrequency === "monthly"
    );

    // helper to push a task into a sprint and account for remaining hours
    // - allowOverflow: when true, always allocate the requested hours (used for user weekly goals)
    // - minRemaining: soft lower bound for sprint.remainingHours (defaults to -5)
    function pushTaskToSprint(
        sprint: any,
        task: any,
        allowOverflow = false,
        minRemaining = -5,
    ) {
        const alloc = Math.max(0, Math.round(task.allocatedHours || 0));
        if (alloc <= 0) return 0;

        if (allowOverflow) {
            // Always allocate full user-requested hours for weekly goals — do not drop user hours.
            const t = { ...task, allocatedHours: alloc, id: task.id || rndId("task") };
            sprint.tasks.push(t);
            sprint.remainingHours = sprint.remainingHours - alloc;
            return alloc;
        }

        // conservative allocation: only use available hours down to minRemaining
        const availableAboveMin = Math.max(0, sprint.remainingHours - minRemaining);
        const use = Math.min(alloc, availableAboveMin);
        if (use <= 0) return 0;
        const t = { ...task, allocatedHours: use, id: task.id || rndId("task") };
        sprint.tasks.push(t);
        sprint.remainingHours = sprint.remainingHours - use;
        return use;
    }

    // STEP 1: assign weekly goals to every sprint — never drop user-set weekly hours.
    // We allocate the full requested weekly hours into each sprint. This may push
    // sprint.remainingHours below zero; a soft overrun of -5 hours is tolerated.
    // STEP 1: assign weekly goals to every sprint — allocate proportionally based on sprint capacity
    // For full weeks (capacity === weeklyLimit) this allocates the full requested hours.
    // For partial weeks (capacity < weeklyLimit) this allocates: round(goal.hours * capacity / weeklyLimit).
    for (const sprint of sprints) {
        for (const goal of weeklyGoals) {
            const hours = (goal.effort && goal.effort.hours) || 0;
            if (hours <= 0) continue;
            let alloc = hours;
            if (weeklyLimit > 0) {
                alloc = Math.max(0, Math.round((hours * (sprint.weeklyCapacity || 0)) / weeklyLimit));
            }
            if (alloc <= 0) continue;
            const task = {
                id: rndId("task"),
                name: goal.name,
                sourceGoalId: goal.id,
                effortType: "weekly",
                allocatedHours: alloc,
                priority: goal.priority || "medium",
            };
            // conservative allocation: do not allow overflow for weekly allocations
            pushTaskToSprint(sprint, task, false, 0);
        }
    }

    // STEP 2: allocate monthly goals across sprints by filling remaining free hours per sprint
    // Algorithm: sort monthly goals by priority, then for each goal repeatedly take each
    // sprint's available capacity (above a soft minRemaining) and place as much of the
    // goal as fits. If after exhausting all sprints some hours remain, force them into
    // the last sprint to preserve user hours.
    const priorityValue = (p: string | undefined) =>
        p === "high" ? 1 : p === "medium" ? 2 : 3;
    const monthlySorted = [...monthlyGoals].sort(
        (a: any, b: any) => priorityValue(a.priority) - priorityValue(b.priority),
    );

    for (const goal of monthlySorted) {
        const total =
            (goal.effort && (goal.effort.monthlyEquivalentHours ?? goal.effort.hours)) || 0;
        if (total <= 0) continue;

        let remainingToPlace = Math.round(total);
        const minRemaining = -5; // allow small soft overrun when forcing into last sprint

        for (let i = 0; i < sprints.length && remainingToPlace > 0; i++) {
            const sprint = sprints[i];
            const available = Math.max(0, sprint.remainingHours - minRemaining);
            if (available <= 0) continue;
            const take = Math.min(available, remainingToPlace);
            if (take <= 0) continue;
            const task = {
                id: rndId("task"),
                name: goal.name,
                sourceGoalId: goal.id,
                effortType: "monthly",
                allocatedHours: take,
                priority: goal.priority || "medium",
            };
            pushTaskToSprint(sprint, task, false, minRemaining);
            remainingToPlace -= take;
        }

        if (remainingToPlace > 0) {
            // force remaining into last sprint to avoid dropping user hours
            const last = sprints[sprints.length - 1];
            const forcedTask = {
                id: rndId("task"),
                name: goal.name,
                sourceGoalId: goal.id,
                effortType: "monthly",
                allocatedHours: remainingToPlace,
                priority: goal.priority || "medium",
            };
            pushTaskToSprint(last, forcedTask, true);
            remainingToPlace = 0;
        }
    }

    // final cleanup: strip helper fields and normalize tasks
    const cleaned = sprints.map((s) => ({
        id: s.id,
        name: s.name,
        startAt: s.startAt,
        endAt: s.endAt,
        tasks: s.tasks.map((t: any) => ({
            id: t.id,
            name: t.name,
            effortType: t.effortType,
            allocatedHours: t.allocatedHours,
            priority: t.priority,
            sourceGoalId: t.sourceGoalId,
        })),
    }));

    const payload = {
        epicId: rndId("epc"),
        epicName: epic.name || null,
        epicMonth: epic.month || null,
        sprints: cleaned,
    };

    // log payload for inspection

    console.log("createStructuredPlan - payload:", JSON.stringify(payload, null, 2));

    return payload;
}

export default createStructuredPlan;
