-- Migration: Remove Eisenhower matrix fields
-- These fields (is_urgent, is_important) are being removed in favor of
-- simple priority (low/medium/high) plus the needs_attention flag.

-- Drop the columns from issues table
ALTER TABLE issues DROP COLUMN IF EXISTS is_urgent;
ALTER TABLE issues DROP COLUMN IF EXISTS is_important;
