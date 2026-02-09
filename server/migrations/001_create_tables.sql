-- Migration: create sprints, tasks, sessions
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sprints (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dateExpectedToStart TEXT,
  dateExpectedToEnd TEXT,
  dateStarted TEXT,
  dateEnded TEXT,
  status TEXT,
  plannedTime INTEGER DEFAULT 0,
  actualTimeSpent INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  sprintId TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  plannedTime INTEGER DEFAULT 0,
  timeSpent INTEGER DEFAULT 0,
  timeActuallySpent INTEGER DEFAULT 0,
  startedAt TEXT,
  endedAt TEXT,
  completed INTEGER DEFAULT 0,
  FOREIGN KEY (sprintId) REFERENCES sprints(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  startedAt TEXT,
  endedAt TEXT,
  duration INTEGER DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON tasks(sprintId);
CREATE INDEX IF NOT EXISTS idx_sessions_task ON sessions(taskId);
