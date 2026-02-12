PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS task_checklists (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL,
  title TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  completedAt TEXT,
  createdAt TEXT,
  updatedAt TEXT,
  position INTEGER,
  FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_checklists_task ON task_checklists(taskId);
