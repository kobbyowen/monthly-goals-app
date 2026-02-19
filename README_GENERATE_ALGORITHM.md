Generate Todos Allocation Algorithm — Requirements

Overview

- Purpose: allocate a user's daily time budget across a set of tasks so allocations are fair, deterministic, respect recurring needs first, and produce final allocations that conform to rounding/bucket rules and task capacity.

Inputs

- tasks: array of task objects. Each task must include:
  - id (string): stable identifier.
  - total_time_needed_seconds (number): total planned need for the task (seconds).
  - total_time_used_seconds (number): seconds already used on the task.
  - priority (string): one of `high`, `medium`, `low` (default to `high` if missing).
  - recurring (boolean): whether the task is recurring.
- dailyBudgetSeconds (number): the total seconds available to allocate today (must be > 0).
- daysLeft (number): integer days remaining in the sprint/context (>= 1; treat <=0 as 1 for input validation).

Output

- An array of allocation objects (one per task allocated):
  - id (string)
  - time_allocated_seconds (integer, seconds)
  - priority (string) — copied from the task
  - Optional metadata: score (number) may be returned to aid debugging, but is not required for correctness.
- Additionally: numeric summary fields returned or easily derivable:
  - totalAllocatedSeconds
  - unallocatedSeconds (if total task demand < budget)

High-Level Expectations (behavioral, no algorithm detail)

- Recurring tasks are satisfied before any non-recurring task receives allocation.
- If total remaining need of recurring tasks <= daily budget, allocate each recurring task its full remaining need (subject to rounding rules).
- If total recurring need > daily budget, recurring tasks must receive a fair, per-day-aware share of the budget:
  - Per-task share should consider the task’s remaining need and `daysLeft` (tasks with less remaining time or fewer days left should not be favored to exceed their need).
  - No recurring allocation may exceed that task’s remaining need.
- After recurring allocations, remaining budget (if any) is allocated to non-recurring tasks:
  - Allocation ordering should prefer higher-priority and more urgent tasks (progress toward completion or untouched tasks may increase priority), but final allocation must still respect per-task remaining need.
- The system must never allocate more seconds to a task than its remaining need (i.e., allocated + used <= needed).
- Determinism: given identical inputs, output must be identical every run.

Rounding & Bucket Rules (mandatory)

- Base allocation granularity: 5-minute increments (300 seconds). No allocation may be smaller than this granularity, except a zero allocation.
- Final allocations must be expressed in seconds that correspond to per-hour preferred minute buckets: {0, 5, 15, 30, 45, 60} minutes within each hour (i.e., per-task allocation minutes per hour must be one of those values).
- Sum invariant: The sum of `time_allocated_seconds` across all returned allocations must equal `min(dailyBudgetSeconds, totalTaskDemandRounded)` where:
  - `totalTaskDemandRounded` is the maximum allocatable total after applying per-task remaining-need limits and bucket rounding rules.
  - If total demand (after respecting remaining need and bucket rules) is less than the budget, return the allocated demand and expose `unallocatedSeconds = dailyBudgetSeconds - totalAllocatedSeconds`.
- If exact equality to `dailyBudgetSeconds` is impossible due to lack of demand, return all demand and report leftover as `unallocatedSeconds`. Otherwise, aim to fully consume `dailyBudgetSeconds` by adjusting allocations within the rounding/bucket constraints while preserving per-task capacity.

Fairness & Caps

- No single non-recurring task should receive more than half the remaining daily budget unless there are <= 2 candidate tasks (in which case larger shares are allowed).
- There must be a minimum reasonable per-task allocation threshold to avoid scattering tiny amounts (e.g., allocations that are below a single 5-minute slot are not allowed).
- When distributing leftover budget (after applying bucket rounding), prefer upgrading higher-priority tasks first (but never exceeding remaining need).

Anti-starvation & Full-budget Usage

- Anti-starvation: The algorithm must ensure no eligible task is starved. When the algorithm is executed repeatedly (for example, hourly or daily) with sufficient user-allocated time across runs, every task with remaining need should receive allocation over time. Tie-breaking and scheduling across repeated runs must be deterministic and stable so that every task gets its turn.
- Full-budget usage: Unless the total remaining demand across all tasks is strictly less than `dailyBudgetSeconds`, the algorithm must allocate the entire `dailyBudgetSeconds` so there is no free/unallocated time. If exact consumption is impossible only because total task demand is lower than the budget, return the demand and report `unallocatedSeconds` with reason `INSUFFICIENT_DEMAND`.

Edge Cases & Validation

- If `dailyBudgetSeconds` <= 0, return empty allocations and a validation error.
- If `tasks` is empty, return empty allocations and `unallocatedSeconds = dailyBudgetSeconds`.
- Tasks with `total_time_needed_seconds <= total_time_used_seconds` are ignored (no allocation).
- `daysLeft` <= 0 treat as 1.
- If `recurring` is missing or null, treat as `false`.
- Null/undefined numeric fields must be interpreted as zero only after explicit validation and logging.
- All returned `time_allocated_seconds` must be integers.

Error Handling & Contracts

- Validate inputs and return clear, machine-readable error messages for invalid input (e.g., missing `tasks`, non-numeric `dailyBudgetSeconds`).
- On partial allocation (when budget cannot be fully consumed), include `unallocatedSeconds` and an explicit reason code: `INSUFFICIENT_DEMAND`.
- Ensure any runtime exceptions are surfaced as predictable error responses; do not silently drop allocations.

Determinism, Observability & Debugging

- Routine must be deterministic: tie-breakers (e.g., equal score tasks) must use a stable sort order derived from task `id`.
- Return optional debugging metadata for each allocation (e.g., computed priority score or intermediate bucket value) under a `debug` flag — only for testing and not required in production.
- Log (or return when requested) the sequence of decisions that led to final allocations in human-readable form for QA (e.g., “recurring-first satisfied 1h; greedily allocated 5h to task X; 0.5h unallocated due to demand”).

Performance

- Target latency: function should execute in O(N log N) worst-case for N tasks and complete within a few tens of milliseconds for N up to 1000 on typical server hardware.
- Memory: operate in-memory without external I/O; no persistent side effects.

Acceptance Tests (examples of expected outputs)

- Test 1 (simple recurring-first):
  - Inputs: `dailyBudgetSeconds = 21600` (6 hours). Tasks: A recurring with 3600s remaining, B non-recurring with 28800s remaining.
  - Expected: allocation: A = 3600s, B = 18000s. `totalAllocatedSeconds = 21600`, `unallocatedSeconds = 0`.
- Test 2 (insufficient demand):
  - Inputs: `dailyBudgetSeconds = 7200` (2 hours). Tasks total remaining demand = 5400s.
  - Expected: allocations sum to 5400s, `unallocatedSeconds = 1800`, reason `INSUFFICIENT_DEMAND`.
- Test 3 (bucket rounding behavior):
  - Inputs produce an allocation candidate that would be 7 minutes; final allocations must be in allowed buckets — specify exact expected bucket outcome (e.g., 5 or 15 minutes) according to the product requirement that final allocations use the allowed per-hour minute buckets and the budget should still be consumed where possible.
- Test 4 (daysLeft influence):
  - A recurring task with 6 hours remaining and `daysLeft = 3`, daily budget 4 hours; expected recurring allocation <= min(half of daily budget per task cap, per-day share of remaining need) and never exceed remaining need.

Acceptance Criteria

- All unit tests above pass.
- For a broad sweep of randomized inputs (varying budgets, daysLeft, priorities), the routine:
  - returns allocations whose total <= budget and <= total demand,
  - respects recurring-first mandate,
  - delivers allocations in required bucket multiples,
  - is deterministic,
  - reports `unallocatedSeconds` only when demand < budget.
- Code that calls this routine must be able to rely on the output schema and invariants without additional normalization.

Notes

- This document purposefully omits implementation details; it only specifies inputs, outputs, invariants, constraints, and acceptance tests so another agent or engineer can implement the algorithm deterministically.
