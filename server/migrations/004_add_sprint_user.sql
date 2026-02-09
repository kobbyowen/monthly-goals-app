PRAGMA foreign_keys = ON;

ALTER TABLE sprints ADD COLUMN userId TEXT;

CREATE INDEX IF NOT EXISTS idx_sprints_user ON sprints(userId);
