type AnyObj = { [k: string]: any };

function sum<T>(arr: T[] | undefined, fn: (v: T) => number) {
    if (!arr || !arr.length) return 0;
    return arr.reduce((acc, v) => acc + (fn(v) || 0), 0);
}

function taskUsed(t: AnyObj) {
    const sessions = Array.isArray(t.sessions) ? t.sessions : [];
    const sessionSum = sum(sessions, (s: AnyObj) => Number(s.duration || 0));
    if (sessionSum > 0) return sessionSum;
    if (typeof t.timeActuallySpent === "number" && t.timeActuallySpent > 0)
        return Number(t.timeActuallySpent);
    if (typeof t.timeSpent === "number" && t.timeSpent > 0) return Number(t.timeSpent);
    return 0;
}

function taskPlanned(t: AnyObj) {
    return Number(t.plannedTime || 0);
}

export function computeEpicMetrics(epic: AnyObj | null | undefined) {
    if (!epic) {
        return {
            totalPlanned: 0,
            totalUsed: 0,
            checklistTotal: 0,
            checklistCompleted: 0,
            completionPercent: 0,
            tasks: {
                all: [] as AnyObj[],
                todo: [] as AnyObj[],
                inProgress: [] as AnyObj[],
                completed: [] as AnyObj[],
            },
            groupTotals: {
                todo: { count: 0, planned: 0, used: 0 },
                inProgress: { count: 0, planned: 0, used: 0 },
                completed: { count: 0, planned: 0, used: 0 },
            },
        };
    }

    // collect tasks from epic and its sprints
    const epicTasks = Array.isArray(epic.tasks) ? epic.tasks : [];
    const sprintTasks = (Array.isArray(epic.sprints) ? epic.sprints : []).flatMap((sp: AnyObj) =>
        Array.isArray(sp.tasks) ? sp.tasks : [],
    );
    const allTasks = [...epicTasks, ...sprintTasks];

    // totals
    const epicPlanned = Number(epic.plannedTime || 0);
    const sprintsPlanned = sum(epic.sprints, (sp: AnyObj) => Number(sp.plannedTime || 0));
    const tasksPlanned = sum(allTasks, (t: AnyObj) => taskPlanned(t));
    const totalPlanned = epicPlanned + sprintsPlanned + tasksPlanned;

    const epicUsed = Number(epic.actualTimeSpent || 0);
    const sprintsUsed = sum(epic.sprints, (sp: AnyObj) => Number(sp.actualTimeSpent || 0));
    const tasksUsed = sum(allTasks, (t: AnyObj) => taskUsed(t));
    const totalUsed = epicUsed + sprintsUsed + tasksUsed;

    // checklists
    const checklistTotal = sum(allTasks, (t: AnyObj) => (Array.isArray(t.checklists) ? t.checklists.length : 0));
    const checklistCompleted = sum(allTasks, (t: AnyObj) => {
        const list = Array.isArray(t.checklists) ? t.checklists : [];
        return list.reduce((acc: number, c: AnyObj) => acc + (c && c.completed ? 1 : 0), 0);
    });

    // group tasks
    const tasksTodo: AnyObj[] = [];
    const tasksInProgress: AnyObj[] = [];
    const tasksCompleted: AnyObj[] = [];

    allTasks.forEach((t: AnyObj) => {
        const sessions = Array.isArray(t.sessions) ? t.sessions : [];
        const inProgress = !t.completed && sessions.length > 0;
        const todo = !t.completed && sessions.length === 0;
        const completed = !!t.completed;

        if (completed) tasksCompleted.push(t);
        else if (inProgress) tasksInProgress.push(t);
        else if (todo) tasksTodo.push(t);
    });

    function groupTotalsFor(list: AnyObj[]) {
        const count = list.length;
        const planned = sum(list, (t: AnyObj) => taskPlanned(t));
        const used = sum(list, (t: AnyObj) => taskUsed(t));
        return { count, planned, used };
    }

    const groupTotals = {
        todo: groupTotalsFor(tasksTodo),
        inProgress: groupTotalsFor(tasksInProgress),
        completed: groupTotalsFor(tasksCompleted),
    };

    // completion percent should be based on task completion (completed tasks / total tasks)
    const totalTasksCount = allTasks.length;
    const completionPercent = totalTasksCount === 0 ? 0 : Math.round((tasksCompleted.length / totalTasksCount) * 100);

    return {
        totalPlanned,
        totalUsed,
        checklistTotal,
        checklistCompleted,
        completionPercent,
        tasks: {
            all: allTasks,
            todo: tasksTodo,
            inProgress: tasksInProgress,
            completed: tasksCompleted,
        },
        groupTotals,
    };
}

export default computeEpicMetrics;
