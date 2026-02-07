-- Migration: Add default_assignee_id to projects
-- When set, new issues created via quick-add (or API without explicit assignee)
-- inherit this default. Can still be overridden per-issue.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS default_assignee_id UUID REFERENCES users(id) ON DELETE SET NULL;
