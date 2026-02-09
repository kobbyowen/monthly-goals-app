PRAGMA foreign_keys = ON;

ALTER TABLE sprints ADD COLUMN kind TEXT DEFAULT 'epic';
ALTER TABLE sprints ADD COLUMN epicId TEXT;
