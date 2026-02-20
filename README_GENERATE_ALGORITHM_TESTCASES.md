Comprehensive Test Cases for Generate Todos Algorithm (50)

Below are 50 targeted test cases covering edge conditions, rounding and bucket behavior, recurring vs non-recurring interactions, days-left effects, starvation prevention, and full-budget constraints. Each test lists inputs (tasks, budget, daysLeft) and the expected allocations and summary fields.

Common units: seconds (s), hours (h). 1h = 3600s, 30m = 1800s, 15m = 900s, 5m = 300s.

Test 1 — Zero budget

- Tasks: A(need=3600, used=0, recurring=false)
- dailyBudgetSeconds: 0
- daysLeft: 1
- Expected: allocations=[], totalAllocatedSeconds=0, unallocatedSeconds=0, error=VALIDATION_ERROR

Test 2 — No tasks

- Tasks: []
- dailyBudgetSeconds: 14400 (4h)
- daysLeft: 1
- Expected: allocations=[], totalAllocatedSeconds=0, unallocatedSeconds=14400, reason=INSUFFICIENT_DEMAND

Test 3 — Single small task fits bucket

- Tasks: A(need=600, used=0, recurring=false)
- dailyBudgetSeconds: 3600
- daysLeft: 1
- Expected: bucket rounding decision point. Example deterministic expected: A = 900s (15m), totalAllocatedSeconds=900, unallocatedSeconds=2700

Test 4 — Single task equals budget

- Tasks: A(need=7200, used=0, recurring=false)
- dailyBudgetSeconds: 7200
- daysLeft: 1
- Expected: A=7200, totalAllocatedSeconds=7200, unallocatedSeconds=0

Test 5 — Task already complete

- Tasks: A(need=3600, used=3600, recurring=false)
- dailyBudgetSeconds: 3600
- daysLeft: 1
- Expected: allocations=[], totalAllocatedSeconds=0, unallocatedSeconds=3600, reason=INSUFFICIENT_DEMAND

Test 6 — All recurring but lower demand than budget

- Tasks: A(recurring, need=1800, used=0), B(recurring, need=3600, used=0)
- dailyBudgetSeconds: 10800 (3h)
- daysLeft: 1
- Expected: A=1800, B=3600, totalAllocatedSeconds=5400, unallocatedSeconds=5400, reason=INSUFFICIENT_DEMAND

Test 7 — All recurring greater than budget (fair per-day share)

- Tasks: A(recurring, need=7200), B(recurring, need=7200)
- dailyBudgetSeconds: 7200 (2h)
- daysLeft: 2
- Expected: A=3600, B=3600 => totalAllocated=7200, unallocated=0

Test 8 — Recurring priority cap enforcement

- Tasks: A(recurring, need=14400), B(recurring, need=3600)
- dailyBudgetSeconds: 7200
- daysLeft: 3
- Expected: B=3600, A=3600, total=7200

Test 9 — Mix recurring + non-recurring, recurring consumes budget

- Tasks: A(recurring, need=10800), B(non-rec, need=7200)
- dailyBudgetSeconds: 7200
- daysLeft: 2
- Expected: A=3600, B=3600, total=7200

Test 10 — Non-recurring greedy by priority

- Tasks: A(non-rec, need=28800, priority=high), B(non-rec, need=28800, priority=low)
- dailyBudgetSeconds: 14400 (4h)
- daysLeft: 1
- Expected: A=10800, B=3600 => total=14400 (example consistent with priority weighting and rounding)

Test 11 — Minimum-per-task threshold avoids tiny scattering

- Tasks: A,B,C,D each need large
- dailyBudgetSeconds: 1800 (30m)
- daysLeft: 1
- Expected: deterministic single task receives 1800 (by stable id order), total=1800

Test 12 — Leftover SLOT distribution round-robin

- Tasks: A,B,C each non-rec large
- dailyBudgetSeconds: 3600 (1h)
- daysLeft:1
- Expected: A=1200,B=1200,C=1200 total=3600

Test 13 — Preferred bucket upgrade favors higher priority

- Tasks: A(high), B(medium)
- dailyBudgetSeconds: 5400 (1.5h)
- daysLeft:1
- Expected: A=2700,B=2700 total=5400; if upgrades required, A upgraded first

Test 14 — Deterministic tie-break on id

- Tasks: A(id='a'), B(id='b') equal score
- dailyBudgetSeconds: 3600
- Expected: 'a' prioritized for tie-break slots

Test 15 — daysLeft=0 treated as 1

- Tasks: A(recurring need=7200)
- dailyBudgetSeconds: 3600
- daysLeft: 0
- Expected: allocate 3600

Test 16 — Multiple small recurring tasks, anti-starvation turn-taking

- Tasks: A,B,C,D recurring each need=3600
- dailyBudgetSeconds: 3600
- daysLeft: 4
- Expected: A=900,B=900,C=900,D=900 total=3600

Test 17 — Recurring tiny fractional need vs bucket

- Tasks: A(recurring need=450s)
- dailyBudgetSeconds: 3600
- daysLeft:1
- Expected: allocate 900s, unallocated=2700

Test 18 — Exact bucket hour roll-up

- Tasks: A(non-rec need=37800)
- dailyBudgetSeconds: 3600
- Expected: A=3600

Test 19 — Multiple tasks where demand < budget

- Tasks: A=1800, B=2700
- dailyBudgetSeconds: 14400
- Expected: A=1800,B=2700 total=4500 unallocated=9900 reason=INSUFFICIENT_DEMAND

Test 20 — Rounding under-allocation then greedy fill

- Tasks: A=3700, B=3700
- dailyBudgetSeconds: 7200
- Expected: A=3600,B=3600 total=7200

Test 21 — Single task smaller than a slot

- Tasks: A=120
- dailyBudgetSeconds: 3600
- Expected: A=0, unallocated=3600 reason=INSUFFICIENT_DEMAND

Test 22 — Scalability spot: 20 tasks

- Tasks: 20 tasks each need >=8h
- dailyBudgetSeconds: 14400
- Expected: deterministic distribution summing to 14400

Test 23 — Priority bump for untouched tasks

- Tasks: A(totalUsed=0 high), B(progressed 80% medium)
- dailyBudgetSeconds: 7200
- Expected: A favored in allocations

Test 24 — Recurring equals budget

- Tasks: A(recurring 7200)
- dailyBudgetSeconds: 7200
- Expected: A=7200

Test 25 — Many recurring tasks larger than budget

- Tasks: A,B,C recurring 14400 each
- dailyBudgetSeconds: 7200 daysLeft=4
- Expected: deterministic split summing to 7200 respecting caps

Test 26 — Some tasks already complete

- Tasks: A done, B needs 7200
- dailyBudgetSeconds: 3600
- Expected: B=3600

Test 27 — Non-integer seconds normalized

- Tasks: A need=10000.7 used=123.4
- dailyBudgetSeconds: 3600
- Expected: normalized and allocated in slots

Test 28 — Upgrade priority for leftover

- Tasks: A(high), B(medium)
- dailyBudgetSeconds: small leftover
- Expected: A upgraded first

Test 29 — Stable ordering independent of input order

- Tasks permuted
- dailyBudgetSeconds: 3600
- Expected: identical allocations across permutations

Test 30 — Tiny high-priority among big tasks

- Tasks: A high need=900, B/C large
- dailyBudgetSeconds: 7200
- Expected: A filled first, remainder distributed

Test 31 — Many tiny tasks fit total

- Tasks: 12 tasks each 300s
- dailyBudgetSeconds: 3600
- Expected: each 300s, total=3600

Test 32 — Tiny tasks exceeding budget slightly

- Tasks: 13 tasks \* 300s = 3900
- dailyBudgetSeconds: 3600
- Expected: first 12 get 300s each =3600

Test 33 — Rounding must not over-allocate

- Tasks: A need=3500
- dailyBudgetSeconds: 3600
- Expected: A <=3500, remainder handled elsewhere

Test 34 — Negative daysLeft treated as 1

- Tasks: A recurring 7200
- daysLeft=-3 dailyBudgetSeconds=3600
- Expected: 3600 allocated

Test 35 — Tiny recurring need plus large non-rec

- Tasks: A(recurring=300), B(non-rec=7200)
- dailyBudgetSeconds: 3600
- Expected: A may be satisfied (or zero if min-slot prevents); remainder to B

Test 36 — Starvation prevention across repeated runs

- Tasks: 5 tasks large, repeated hourly runs
- Expected: each receives at least one slot across runs

Test 37 — Single candidate may take full budget

- Tasks: A large
- dailyBudgetSeconds: 3600
- Expected: A=3600

Test 38 — Multiple high-priority tasks cap enforcement

- Tasks: A,B,C high
- dailyBudgetSeconds: 3600
- Expected: fair split e.g., 1200 each

Test 39 — Fractional-slot leftover handling

- dailyBudgetSeconds: 3700
- Expected: allocate in 300s slots; totalAllocated=3600, unallocated=100

Test 40 — Sprint date format tolerance (validation)

- Input: varied start/end formats
- Expected: sprint detection robust; allocations proceed

Test 41 — Large daysLeft reduces per-day share

- Tasks: A 20h, B 10h recurring
- dailyBudgetSeconds: 14400 daysLeft=10
- Expected: per-day ~2h and 1h respectively after rounding and caps

Test 42 — 45-minute exact bucket

- dailyBudgetSeconds: 2700
- Expected: allocate 2700 to candidate

Test 43 — 15-minute multiples across tasks

- dailyBudgetSeconds: 3600
- Expected: per-task allocations that are 15m multiples and sum to 3600

Test 44 — 50-task performance

- dailyBudgetSeconds: 28800
- Expected: allocations sum 28800 and complete quickly

Test 45 — Duplicate IDs invalid input

- Expected: validation error or deterministic dedupe

Test 46 — Demand just under budget by one slot

- Tasks: A need=35700 dailyBudget=36000
- Expected: allocate 35700, unallocated=300

Test 47 — Half-daily cap scenario

- Tasks: A,B recurring 2h each
- dailyBudgetSeconds: 3600 daysLeft=1
- Expected: A=1800,B=1800

Test 48 — Respect remaining need under rounding

- Tasks: A need=4000 dailyBudget=7200
- Expected: A <=4000 even if rounding suggests more

Test 49 — Preferred bucket exact (1h15m)

- dailyBudgetSeconds: 4500
- Expected: allocation of 4500 accepted

Test 50 — Complex mixed scenario

- Tasks: A(recurring 1h high), B(recurring 3h med), C(non-rec 4h high), D(non-rec 2h low)
- dailyBudgetSeconds: 21600 daysLeft=3
- Expected example: A=900, B=3600, C=12600, D=4500 => total=21600 (example deterministic outcome)

---

Notes about expected values

- Where per-minute bucket rounding could yield multiple valid outcomes (e.g., whether 7 minutes becomes 5 or 15), tests above intentionally highlight decision points; the implementing agent should follow the README's stated rounding/upgrading policy and be deterministic. Tests that depend on specific rounding choices include explanatory notes; acceptance harnesses should either assert strict expected numbers if the rounding rule is deterministic or assert invariants (bucket compliance, total sum, no over-allocation, recurring-first) when multiple rounding choices are permissible.
