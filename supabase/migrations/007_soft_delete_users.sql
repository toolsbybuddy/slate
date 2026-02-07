-- Add soft delete support for users
-- Preserves data integrity and audit trail

ALTER TABLE users 
ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN deleted_at TIMESTAMPTZ;

-- Index for filtering out deleted users efficiently
CREATE INDEX idx_users_is_deleted ON users(is_deleted) WHERE is_deleted = false;

-- Comment for documentation
COMMENT ON COLUMN users.is_deleted IS 'Soft delete flag - deleted users are hidden but data preserved';
COMMENT ON COLUMN users.deleted_at IS 'Timestamp when user was soft deleted';
