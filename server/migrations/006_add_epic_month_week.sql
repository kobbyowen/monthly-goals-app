PRAGMA foreign_keys = ON;

-- Month metadata for epics (year + month)
ALTER TABLE sprints ADD COLUMN epicYear INTEGER;
ALTER TABLE sprints ADD COLUMN epicMonth INTEGER;

-- Week-of-month for child sprints
ALTER TABLE sprints ADD COLUMN weekOfMonth INTEGER;
