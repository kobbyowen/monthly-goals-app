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

    // initialize sprint containers
    const sprints = sprintsSrc.map((s: any, idx: number) => ({
        id: `spr_${String(idx + 1).padStart(3, "0")}`,
        name: s.name || s.name,
        startAt: s.startDate || s.startAt || null,
        endAt: s.endDate || s.endAt || null,
        weeklyCapacity: weeklyLimit,
        remainingHours: weeklyLimit,
        tasks: [] as any[],
    }));

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
    for (const sprint of sprints) {
        for (const goal of weeklyGoals) {
            const hours = (goal.effort && goal.effort.hours) || 0;
            if (hours <= 0) continue;
            const task = {
                id: rndId("task"),
                name: goal.name,
                sourceGoalId: goal.id,
                effortType: "weekly",
                allocatedHours: hours,
                priority: goal.priority || "medium",
            };
            // ensure full allocation for weekly goals
            pushTaskToSprint(sprint, task, true);
        }
    }

    // STEP 2: distribute monthly goals across sprints fairly (early-first remainder)
    for (const goal of monthlyGoals) {
        const total =
            (goal.effort && (goal.effort.monthlyEquivalentHours ?? goal.effort.hours)) || 0;
        if (total <= 0) continue;

        // base allocation per sprint (integer hours) + remainder
        const base = Math.floor(total / numSprints);
        let remainder = total - base * numSprints;

        for (let i = 0; i < sprints.length && (base > 0 || remainder > 0); i++) {
            const sprint = sprints[i];
            const alloc = base + (remainder > 0 ? 1 : 0);
            if (remainder > 0) remainder--;
            if (alloc <= 0) continue;
            const task = {
                id: rndId("task"),
                name: goal.name,
                sourceGoalId: goal.id,
                effortType: "monthly",
                allocatedHours: alloc,
                priority: goal.priority || "medium",
            };
            // try to allocate conservatively allowing per-sprint soft overrun to minRemaining=-5
            const used = pushTaskToSprint(sprint, task, false, -5);
            if (used < alloc) {
                let remainingToPlace = alloc - used;
                // try to place remainder into later sprints (also respecting the -5 soft overrun)
                for (let j = i + 1; j < sprints.length && remainingToPlace > 0; j++) {
                    const nextSprint = sprints[j];
                    const carryAlloc = Math.min(remainingToPlace, Math.max(0, nextSprint.remainingHours - -5));
                    if (carryAlloc > 0) {
                        const used2 = pushTaskToSprint(
                            nextSprint,
                            {
                                id: rndId("task"),
                                name: goal.name,
                                sourceGoalId: goal.id,
                                effortType: "monthly",
                                allocatedHours: carryAlloc,
                                priority: goal.priority || "medium",
                            },
                            false,
                            -5,
                        );
                        remainingToPlace -= used2;
                    }
                }

                // if we still have remaining hours that couldn't be placed within the soft overrun,
                // force them into the last sprint to guarantee no goal is dropped (preserve user hours).
                if (remainingToPlace > 0) {
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
                }
            }
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

    return {
        epicId: rndId("epc"),
        epicName: epic.name || null,
        epicMonth: epic.month || null,
        sprints: cleaned,
    };
}

export default createStructuredPlan;
