-- Add resolution field to issues for tracking why an issue was closed
-- Valid values: completed, wont_do, duplicate, invalid

ALTER TABLE issues 
ADD COLUMN resolution TEXT;

-- Add constraint to enforce valid resolution values
ALTER TABLE issues
ADD CONSTRAINT valid_resolution 
CHECK (resolution IS NULL OR resolution IN ('completed', 'wont_do', 'duplicate', 'invalid'));

-- Add index for querying by resolution
CREATE INDEX idx_issues_resolution ON issues(resolution) WHERE resolution IS NOT NULL;
