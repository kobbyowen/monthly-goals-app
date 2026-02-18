PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS todo_tasks (
  id TEXT PRIMARY KEY DEFAULT (
    lower(hex(randomblob(4))) || '-' ||
    lower(hex(randomblob(2))) || '-' ||
    '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
    substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
    lower(hex(randomblob(6)))
  ),

  sprint_id TEXT NOT NULL,
  task_id TEXT NULL,

  title TEXT NOT NULL,
  due_date TEXT NOT NULL,

  planned_hours REAL DEFAULT 0,

  used_seconds INTEGER DEFAULT 0,
  started_at TEXT NULL,
  current_session_started_at TEXT NULL,

  status TEXT NOT NULL DEFAULT 'todo',
  completed INTEGER DEFAULT 0,
  completed_at TEXT NULL,

  priority TEXT DEFAULT 'medium',
  sort_order INTEGER DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_todo_status
    CHECK (status IN ('todo','running','paused','completed')),

  FOREIGN KEY (sprint_id) REFERENCES sprints(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_todo_tasks_sprint_id ON todo_tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_task_id ON todo_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_due_date ON todo_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_todo_tasks_status ON todo_tasks(status);

CREATE TRIGGER IF NOT EXISTS trg_todo_tasks_updated_at
AFTER UPDATE ON todo_tasks
FOR EACH ROW
BEGIN
  UPDATE todo_tasks
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;
