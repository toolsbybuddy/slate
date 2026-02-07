-- Migration: Add 'critical' priority level
-- For production-down emergencies. Hierarchy: low < medium < high < critical

-- Drop and recreate the priority check constraint
ALTER TABLE issues DROP CONSTRAINT IF EXISTS valid_priority;
ALTER TABLE issues ADD CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'));
