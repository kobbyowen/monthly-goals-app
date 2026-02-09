#!/usr/bin/env bash
# Smoke test script for Sprint App API
# Usage: BASE_URL=http://localhost:3000 ./scripts/test_api.sh

BASE_URL=${BASE_URL:-http://localhost:3000}
TMPDIR="tmp"
mkdir -p "$TMPDIR"

fail_count=0
passed_count=0

do_req() {
  method="$1"; path="$2"; datafile="$3"; expect="$4"; desc="$5"
  if [[ "$datafile" =~ ^\{ ]]; then
    resp=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$path" -H "Content-Type: application/json" -d "$datafile")
  elif [ -n "$datafile" ]; then
    resp=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$path" -H "Content-Type: application/json" --data-binary "@$datafile")
  else
    resp=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$path")
  fi
  code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')

  ok=1
  if [ "$expect" = "2xx" ]; then
    if [[ "$code" =~ ^2 ]]; then ok=0; fi
  else
    if [ "$code" = "$expect" ]; then ok=0; fi
  fi

  if [ $ok -eq 0 ]; then
    printf "SUCCESS: %s -> %s\n" "$desc" "$code"
    passed_count=$((passed_count+1))
  else
    printf "FAIL:    %s -> status %s\n" "$desc" "$code"
    printf "%s\n" "$body"
    fail_count=$((fail_count+1))
  fi
}

cat > "$TMPDIR/sprint.json" <<'JSON'
{
  "id": "sprint-4",
  "name": "Sprint 4 – Closure & Polish",
  "dateExpectedToStart": "2026-02-23",
  "dateExpectedToEnd": "2026-02-28",
  "dateStarted": "2026-02-23T08:00:00Z",
  "dateEnded": null,
  "status": "in_progress",
  "plannedTime": 172800,
  "actualTimeSpent": 36000,
  "tasks": [
    {
      "id": "task-react-weekly-s4",
      "name": "Advanced React Interview Prep",
      "category": "weekly",
      "plannedTime": 28800,
      "timeSpent": 14400,
      "timeActuallySpent": 0,
      "startedAt": "2026-02-23T08:00:00Z",
      "endedAt": null,
      "completed": false,
      "sessions": [
        {
          "id": "session-001",
          "startedAt": "2026-02-23T08:00:00Z",
          "endedAt": "2026-02-23T10:00:00Z",
          "duration": 7200,
          "notes": "Hooks deep dive"
        }
      ]
    }
  ]
}
JSON

cat > "$TMPDIR/task.json" <<'JSON'
{
  "id": "task-2",
  "name": "Code cleanup",
  "category": "ad-hoc",
  "plannedTime": 3600,
  "timeSpent": 0,
  "timeActuallySpent": 0,
  "startedAt": null,
  "endedAt": null,
  "completed": false
}
JSON

cat > "$TMPDIR/session.json" <<'JSON'
{
  "id": "session-002",
  "startedAt": "2026-02-24T09:00:00Z",
  "endedAt": "2026-02-24T10:30:00Z",
  "duration": 5400,
  "notes": "Routing and performance"
}
JSON

echo "Running API smoke tests against $BASE_URL"

do_req POST /api/sprints "$TMPDIR/sprint.json" 201 "Create sprint"
do_req GET /api/sprints "" 200 "List sprints"
do_req GET /api/sprints/sprint-4 "" 200 "Get sprint sprint-4"
do_req POST /api/sprints/sprint-4/tasks "$TMPDIR/task.json" 201 "Create task task-2"
do_req PATCH /api/tasks/task-react-weekly-s4 '{"dummy":true}' 200 "Patch task (no-op)"
do_req POST /api/tasks/task-react-weekly-s4/sessions "$TMPDIR/session.json" 201 "Create session session-002"
do_req GET /api/tasks/task-react-weekly-s4 "" 200 "Get task task-react-weekly-s4"
do_req PATCH /api/sessions/session-001 '{"notes":"Hooks deep dive — added examples"}' 200 "Patch session-001"
do_req GET /api/tasks/task-react-weekly-s4/sessions "" 200 "List sessions for task-react-weekly-s4"

# cleanup
do_req DELETE /api/sessions/session-002 "" 200 "Delete session-002"
do_req DELETE /api/tasks/task-2 "" 200 "Delete task-2"

echo
echo "Summary: Passed: $passed_count  Failed: $fail_count"
if [ $fail_count -gt 0 ]; then
  exit 2
else
  exit 0
fi
