PRAGMA foreign_keys = ON;

-- Add recurring flag to tasks (0 = false, 1 = true)
ALTER TABLE tasks ADD COLUMN recurring INTEGER DEFAULT 0;

-- Ensure any existing rows get explicit false value
UPDATE tasks SET recurring = 0 WHERE recurring IS NULL;

-- No-op for other DBs; migration runner will skip if column exists.
