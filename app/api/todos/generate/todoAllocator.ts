const PRIORITY_WEIGHT = Object.freeze({
  high: 3,
  medium: 2,
  low: 1
});

const FIVE_MINUTES_SECONDS = 300;
const ALLOWED_MINUTE_REMAINDERS = Object.freeze([0, 5, 15, 30, 45]);

type Priority = 'high' | 'medium' | 'low';

interface TaskInput {
  id: string;
  total_time_needed_seconds: number | null | undefined;
  total_time_used_seconds: number | null | undefined;
  priority?: Priority | string;
  recurring?: boolean | null;
}

interface ValidationError {
  code: string;
  message: string;
}

interface AllocationOutput {
  id: string;
  time_allocated_seconds: number;
  priority: Priority;
  score?: number;
}

interface AllocationResponse {
  allocations: AllocationOutput[];
  totalAllocatedSeconds: number;
  unallocatedSeconds: number;
  reason?: 'INSUFFICIENT_DEMAND' | 'VALIDATION_ERROR' | 'RUNTIME_ERROR';
  errors?: ValidationError[];
  debug?: {
    decisions: string[];
  };
}

interface GenerateOptions {
  debug?: boolean;
}

interface PreparedTask {
  id: string;
  priority: Priority;
  recurring: boolean;
  remainingRaw: number;
  capacitySeconds: number;
  progress: number;
  baseScore: number;
  perDayShare: number;
}

export function generateTodosAllocation(
  tasks: TaskInput[],
  dailyBudgetSeconds: number,
  daysLeft: number,
  options: GenerateOptions = {}
): AllocationResponse {
  try {
    const debug = Boolean(options.debug);
    const decisions: string[] = [];
    const validationErrors = validateInputs(tasks, dailyBudgetSeconds, daysLeft);

    if (validationErrors.length > 0) {
      return {
        allocations: [],
        totalAllocatedSeconds: 0,
        unallocatedSeconds: 0,
        reason: 'VALIDATION_ERROR',
        errors: validationErrors
      };
    }

    const normalizedDaysLeft = Math.max(1, Math.trunc(Number(daysLeft)));

    if (tasks.length === 0) {
      return {
        allocations: [],
        totalAllocatedSeconds: 0,
        unallocatedSeconds: dailyBudgetSeconds
      };
    }

    const preparedTasks = tasks
      .map((task, index) => prepareTask(task, index, normalizedDaysLeft, decisions))
      .filter((task): task is PreparedTask => Boolean(task && task.capacitySeconds > 0));

    if (preparedTasks.length === 0) {
      return {
        allocations: [],
        totalAllocatedSeconds: 0,
        unallocatedSeconds: dailyBudgetSeconds,
        reason: 'INSUFFICIENT_DEMAND',
        ...(debug ? { debug: { decisions } } : {})
      };
    }

    const totalTaskDemandRounded = preparedTasks.reduce(
      (sum, task) => sum + task.capacitySeconds,
      0
    );
    const targetTotal = Math.min(dailyBudgetSeconds, totalTaskDemandRounded);

    const recurringTasks = preparedTasks.filter((task) => task.recurring);
    const nonRecurringTasks = preparedTasks.filter((task) => !task.recurring);
    const allocationById = new Map<string, number>();

    let remainingToAllocate = targetTotal;

    if (recurringTasks.length > 0 && remainingToAllocate > 0) {
      const recurringDemand = recurringTasks.reduce(
        (sum, task) => sum + task.capacitySeconds,
        0
      );
      const recurringStageCapDemand = recurringTasks.reduce(
        (sum, task) => sum + Math.min(task.capacitySeconds, task.perDayShare),
        0
      );

      if (recurringDemand <= remainingToAllocate) {
        for (const task of sortByStableId(recurringTasks)) {
          const stageCap = Math.min(task.capacitySeconds, task.perDayShare);
          if (stageCap <= 0) {
            continue;
          }
          allocationById.set(task.id, stageCap);
          remainingToAllocate -= stageCap;
        }
        decisions.push(
          `Recurring-first: daily recurring stage cap allocated ${recurringStageCapDemand}s from ${recurringDemand}s total recurring demand.`
        );
      } else {
        decisions.push(
          `Recurring-first: recurring demand (${recurringDemand}s) exceeds target (${remainingToAllocate}s), applying fair per-day capped distribution.`
        );
        const recurringResult = allocateFairRecurring(
          recurringTasks,
          remainingToAllocate,
          normalizedDaysLeft,
          decisions
        );
        for (const [id, seconds] of recurringResult.entries()) {
          allocationById.set(id, seconds);
          remainingToAllocate -= seconds;
        }
      }
    }

    if (remainingToAllocate > 0 && nonRecurringTasks.length > 0) {
      const remainingBudgetAtStart = remainingToAllocate;
      const nonRecurringResult = allocateNonRecurring(
        nonRecurringTasks,
        remainingToAllocate,
        remainingBudgetAtStart,
        decisions
      );

      for (const [id, seconds] of nonRecurringResult.entries()) {
        const existing = allocationById.get(id) || 0;
        allocationById.set(id, existing + seconds);
        remainingToAllocate -= seconds;
      }
    }

    if (remainingToAllocate > 0) {
      const allTasksById = new Map<string, PreparedTask>(preparedTasks.map((task) => [task.id, task]));
      const topUpResult = topUpToTarget(
        allTasksById,
        allocationById,
        remainingToAllocate,
        decisions
      );
      for (const [id, delta] of topUpResult.entries()) {
        allocationById.set(id, (allocationById.get(id) || 0) + delta);
        remainingToAllocate -= delta;
      }
    }

    const allocations = sortByStableId(preparedTasks)
      .map((task): AllocationOutput | null => {
        const allocated = allocationById.get(task.id) || 0;
        if (allocated <= 0) {
          return null;
        }
        const allocation: AllocationOutput = {
          id: task.id,
          time_allocated_seconds: allocated,
          priority: task.priority
        };
        if (debug) {
          allocation.score = task.baseScore;
        }
        return allocation;
      })
      .filter((a): a is AllocationOutput => Boolean(a));

    const totalAllocatedSeconds = allocations.reduce(
      (sum, allocation) => sum + allocation.time_allocated_seconds,
      0
    );

    const unallocatedSeconds = Math.max(0, dailyBudgetSeconds - totalAllocatedSeconds);
    const response: AllocationResponse = {
      allocations,
      totalAllocatedSeconds,
      unallocatedSeconds
    };

    if (unallocatedSeconds > 0) {
      response.reason = 'INSUFFICIENT_DEMAND';
    }
    if (debug) {
      response.debug = { decisions };
    }
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown runtime exception';
    return {
      allocations: [],
      totalAllocatedSeconds: 0,
      unallocatedSeconds: 0,
      reason: 'RUNTIME_ERROR',
      errors: [{ code: 'RUNTIME_EXCEPTION', message }]
    };
  }
}

function validateInputs(
  tasks: TaskInput[],
  dailyBudgetSeconds: number,
  daysLeft: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!Array.isArray(tasks)) {
    errors.push({
      code: 'INVALID_TASKS',
      message: '`tasks` must be an array.'
    });
  }
  if (!Number.isFinite(dailyBudgetSeconds)) {
    errors.push({
      code: 'INVALID_BUDGET',
      message: '`dailyBudgetSeconds` must be numeric.'
    });
  } else if (dailyBudgetSeconds <= 0) {
    errors.push({
      code: 'INVALID_BUDGET',
      message: '`dailyBudgetSeconds` must be > 0.'
    });
  } else if (!Number.isInteger(dailyBudgetSeconds)) {
    errors.push({
      code: 'INVALID_BUDGET',
      message: '`dailyBudgetSeconds` must be an integer number of seconds.'
    });
  } else if (dailyBudgetSeconds % FIVE_MINUTES_SECONDS !== 0) {
    errors.push({
      code: 'INVALID_BUDGET',
      message: '`dailyBudgetSeconds` must be divisible by 300 (5-minute granularity).'
    });
  }
  if (!Number.isFinite(daysLeft)) {
    errors.push({
      code: 'INVALID_DAYS_LEFT',
      message: '`daysLeft` must be numeric.'
    });
  }
  return errors;
}

function prepareTask(
  rawTask: TaskInput,
  index: number,
  daysLeft: number,
  decisions: string[]
): PreparedTask | null {
  if (!rawTask || typeof rawTask !== 'object') {
    decisions.push(`Task at index ${index} ignored: invalid object.`);
    return null;
  }
  const id = String(rawTask.id || '').trim();
  if (!id) {
    decisions.push(`Task at index ${index} ignored: missing id.`);
    return null;
  }

  const neededRaw = toValidatedNumber(rawTask.total_time_needed_seconds, id, 'needed', decisions);
  const usedRaw = toValidatedNumber(rawTask.total_time_used_seconds, id, 'used', decisions);
  const needed = Math.max(0, neededRaw);
  const used = Math.max(0, usedRaw);
  const remainingRaw = Math.max(0, needed - used);
  if (remainingRaw <= 0) {
    decisions.push(`Task ${id} ignored: no remaining need.`);
    return null;
  }

  const priority = normalizePriority(rawTask.priority);
  const recurring = Boolean(rawTask.recurring);
  const capacitySeconds = floorToAllowedSeconds(remainingRaw);
  if (capacitySeconds <= 0) {
    decisions.push(
      `Task ${id} ignored after rounding: remaining ${remainingRaw}s below allocatable bucket threshold.`
    );
    return null;
  }

  const progress = needed > 0 ? used / needed : 0;
  const untouchedBonus = used === 0 ? 1.25 : 0;
  const nearFinishBonus = progress >= 0.7 ? 0.5 : 0;
  const urgencyBonus = Math.max(0, 1 - progress) * 0.5;
  const baseScore = PRIORITY_WEIGHT[priority] + untouchedBonus + nearFinishBonus + urgencyBonus;

  return {
    id,
    priority,
    recurring,
    remainingRaw,
    capacitySeconds,
    progress,
    baseScore,
    perDayShare: floorToAllowedSeconds(Math.ceil(remainingRaw / Math.max(1, daysLeft)))
  };
}

function allocateFairRecurring(
  recurringTasks: PreparedTask[],
  targetSeconds: number,
  daysLeft: number,
  decisions: string[]
): Map<string, number> {
  const result = new Map<string, number>();
  const byId = sortByStableId(recurringTasks);
  const stageCaps = byId.map((task) => Math.min(task.capacitySeconds, task.perDayShare));
  const perDayWeights = byId.map((task) => {
    const share = Math.max(FIVE_MINUTES_SECONDS, Math.ceil(task.remainingRaw / Math.max(1, daysLeft)));
    return Math.min(Math.min(task.capacitySeconds, task.perDayShare), floorToAllowedSeconds(share));
  });
  const totalWeight = perDayWeights.reduce((sum, value) => sum + value, 0) || byId.length;

  let allocated = 0;
  for (let i = 0; i < byId.length; i += 1) {
    const task = byId[i];
    const proportional = Math.floor((targetSeconds * perDayWeights[i]) / totalWeight);
    const bounded = Math.min(stageCaps[i], floorToAllowedSeconds(proportional));
    if (bounded > 0) {
      result.set(task.id, bounded);
      allocated += bounded;
    }
  }

  let remaining = targetSeconds - allocated;
  while (remaining >= FIVE_MINUTES_SECONDS) {
    const candidates = byId
      .map((task) => {
        const current = result.get(task.id) || 0;
        const stageCap = Math.min(task.capacitySeconds, task.perDayShare);
        if (current >= stageCap) {
          return null;
        }
        const next = nextAllowedSeconds(stageCap, current);
        const delta = next - current;
        if (delta <= 0 || delta > remaining) {
          return null;
        }
        const demandToday = Math.max(FIVE_MINUTES_SECONDS, task.perDayShare);
        const fulfillment = current / demandToday;
        return { task, delta, fulfillment };
      })
      .filter((x): x is { task: PreparedTask; delta: number; fulfillment: number } => Boolean(x))
      .sort((a, b) => {
        if (a.fulfillment !== b.fulfillment) {
          return a.fulfillment - b.fulfillment;
        }
        return a.task.id.localeCompare(b.task.id);
      });

    if (candidates.length === 0) {
      break;
    }
    const selected = candidates[0];
    result.set(selected.task.id, (result.get(selected.task.id) || 0) + selected.delta);
    remaining -= selected.delta;
  }

  decisions.push(
    `Recurring fair-share allocated ${targetSeconds - remaining}s across ${byId.length} recurring tasks.`
  );
  return result;
}

function allocateNonRecurring(
  tasks: PreparedTask[],
  targetSeconds: number,
  remainingBudgetAtStart: number,
  decisions: string[]
): Map<string, number> {
  const result = new Map<string, number>();
  const sorted = sortByStableId(tasks).sort((a, b) => {
    if (b.baseScore !== a.baseScore) {
      return b.baseScore - a.baseScore;
    }
    return a.id.localeCompare(b.id);
  });

  const capForLargePools =
    sorted.length <= 2 ? Number.POSITIVE_INFINITY : floorToAllowedSeconds(remainingBudgetAtStart / 2);

  const capped = sorted.map((task) => ({
    ...task,
    capacitySeconds: Math.min(task.capacitySeconds, capForLargePools)
  }));

  let remaining = targetSeconds;

  if (capped.length <= 2 && remaining >= FIVE_MINUTES_SECONDS) {
    const completableFirst = [...capped]
      .filter((task) => task.capacitySeconds > 0 && task.capacitySeconds <= remaining)
      .sort((a, b) => {
        if (a.capacitySeconds !== b.capacitySeconds) {
          return a.capacitySeconds - b.capacitySeconds;
        }
        if (b.baseScore !== a.baseScore) {
          return b.baseScore - a.baseScore;
        }
        return a.id.localeCompare(b.id);
      });

    for (const task of completableFirst) {
      if (remaining < FIVE_MINUTES_SECONDS) {
        break;
      }
      const allocatable = floorToAllowedSeconds(Math.min(task.capacitySeconds, remaining));
      if (allocatable <= 0) {
        continue;
      }
      result.set(task.id, allocatable);
      remaining -= allocatable;
    }
  }

  for (const task of capped) {
    if (remaining < FIVE_MINUTES_SECONDS) {
      break;
    }
    const current = result.get(task.id) || 0;
    if (current >= task.capacitySeconds) {
      continue;
    }
    const next = nextAllowedSeconds(task.capacitySeconds, current);
    const delta = next - current;
    if (delta <= 0 || delta > remaining) {
      continue;
    }
    result.set(task.id, current + delta);
    remaining -= delta;
  }

  while (remaining >= FIVE_MINUTES_SECONDS) {
    const candidates = capped
      .map((task) => {
        const current = result.get(task.id) || 0;
        if (current >= task.capacitySeconds) {
          return null;
        }
        const next = nextAllowedSeconds(task.capacitySeconds, current);
        const delta = next - current;
        if (delta <= 0 || delta > remaining) {
          return null;
        }
        const starvationBoost = Math.max(0, 1 - task.progress);
        const dynamicScore = task.baseScore + starvationBoost - current / Math.max(1, task.capacitySeconds);
        return { task, delta, dynamicScore };
      })
      .filter((x): x is { task: PreparedTask; delta: number; dynamicScore: number } => Boolean(x))
      .sort((a, b) => {
        if (b.dynamicScore !== a.dynamicScore) {
          return b.dynamicScore - a.dynamicScore;
        }
        return a.task.id.localeCompare(b.task.id);
      });

    if (candidates.length === 0) {
      break;
    }
    const selected = candidates[0];
    result.set(selected.task.id, (result.get(selected.task.id) || 0) + selected.delta);
    remaining -= selected.delta;
  }

  decisions.push(
    `Non-recurring allocation assigned ${targetSeconds - remaining}s across ${capped.length} tasks.`
  );
  return result;
}

function topUpToTarget(
  allTasksById: Map<string, PreparedTask>,
  allocationById: Map<string, number>,
  remainingSeconds: number,
  decisions: string[]
): Map<string, number> {
  const topUp = new Map<string, number>();
  let remaining = remainingSeconds;

  while (remaining >= FIVE_MINUTES_SECONDS) {
    const candidates = Array.from(allTasksById.values())
      .map((task) => {
        const current = (allocationById.get(task.id) || 0) + (topUp.get(task.id) || 0);
        if (current >= task.capacitySeconds) {
          return null;
        }
        const next = nextAllowedSeconds(task.capacitySeconds, current);
        const delta = next - current;
        if (delta <= 0 || delta > remaining) {
          return null;
        }
        const priorityScore = PRIORITY_WEIGHT[task.priority];
        const recurringBonus = task.recurring ? 0.25 : 0;
        return { task, delta, score: priorityScore + recurringBonus };
      })
      .filter((x): x is { task: PreparedTask; delta: number; score: number } => Boolean(x))
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.task.id.localeCompare(b.task.id);
      });

    if (candidates.length === 0) {
      break;
    }
    const selected = candidates[0];
    topUp.set(selected.task.id, (topUp.get(selected.task.id) || 0) + selected.delta);
    remaining -= selected.delta;
  }

  decisions.push(`Top-up stage consumed ${remainingSeconds - remaining}s of leftover budget.`);
  return topUp;
}

export function floorToAllowedSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < FIVE_MINUTES_SECONDS) {
    return 0;
  }
  const wholeMinutes = Math.floor(seconds / 60);
  const fullHours = Math.floor(wholeMinutes / 60);
  const remainderMinutes = wholeMinutes % 60;
  let selectedRemainder = 0;
  for (const allowed of ALLOWED_MINUTE_REMAINDERS) {
    if (allowed <= remainderMinutes) {
      selectedRemainder = allowed;
    } else {
      break;
    }
  }
  return (fullHours * 60 + selectedRemainder) * 60;
}

function nextAllowedSeconds(capacitySeconds: number, currentSeconds: number): number {
  if (capacitySeconds <= 0) {
    return 0;
  }
  for (let candidate = currentSeconds + FIVE_MINUTES_SECONDS; candidate <= capacitySeconds; candidate += FIVE_MINUTES_SECONDS) {
    if (isAllowedBucketSeconds(candidate)) {
      return candidate;
    }
  }
  return currentSeconds;
}

export function isAllowedBucketSeconds(seconds: number): boolean {
  if (seconds === 0) {
    return true;
  }
  if (!Number.isInteger(seconds) || seconds < FIVE_MINUTES_SECONDS) {
    return false;
  }
  if (seconds % FIVE_MINUTES_SECONDS !== 0) {
    return false;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = minutes % 60;
  return ALLOWED_MINUTE_REMAINDERS.includes(remainder);
}

function normalizePriority(priority: TaskInput['priority']): Priority {
  if (priority === 'high' || priority === 'medium' || priority === 'low') {
    return priority;
  }
  return 'high';
}

function toValidatedNumber(value: unknown, id: string, fieldName: string, decisions: string[]): number {
  if (value === null || value === undefined) {
    decisions.push(`Task ${id}: ${fieldName} is null/undefined, treated as 0.`);
    return 0;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    decisions.push(`Task ${id}: ${fieldName} is non-numeric, treated as 0.`);
    return 0;
  }
  return numeric;
}

function sortByStableId<T extends { id: string }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => a.id.localeCompare(b.id));
}
