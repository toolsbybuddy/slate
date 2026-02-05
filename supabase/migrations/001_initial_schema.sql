-- Slate Issue Tracker - Initial Schema
-- Run this in a fresh Supabase project

-- ============================================
-- USERS TABLE
-- Extends Supabase Auth with app-specific fields
-- Bots have is_bot=true and no auth_id
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT NOT NULL,
  avatar_url TEXT,
  is_bot BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up users by auth_id
CREATE INDEX idx_users_auth_id ON users(auth_id);

-- ============================================
-- PERSONAL ACCESS TOKENS
-- For bot API authentication
-- ============================================

CREATE TABLE personal_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pat_user ON personal_access_tokens(user_id);
CREATE INDEX idx_pat_hash ON personal_access_tokens(token_hash);

-- ============================================
-- PROJECTS
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_archived ON projects(is_archived);

-- ============================================
-- LABELS (Global)
-- ============================================

CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ISSUES
-- ============================================

CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT NOT NULL DEFAULT 'medium',
  is_urgent BOOLEAN DEFAULT false,
  is_important BOOLEAN DEFAULT false,
  needs_attention BOOLEAN DEFAULT false,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, number),
  CONSTRAINT valid_status CHECK (status IN ('backlog', 'ready', 'in_progress', 'blocked', 'done')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high'))
);

CREATE INDEX idx_issues_project ON issues(project_id);
CREATE INDEX idx_issues_assignee ON issues(assignee_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_needs_attention ON issues(needs_attention) WHERE needs_attention = true;
CREATE INDEX idx_issues_project_number ON issues(project_id, number);

-- Function to auto-generate issue numbers per project
CREATE OR REPLACE FUNCTION generate_issue_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.number IS NULL THEN
    SELECT COALESCE(MAX(number), 0) + 1 INTO NEW.number
    FROM issues
    WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_issue_number
  BEFORE INSERT ON issues
  FOR EACH ROW
  EXECUTE FUNCTION generate_issue_number();

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ISSUE LABELS (Many-to-Many)
-- ============================================

CREATE TABLE issue_labels (
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (issue_id, label_id)
);

CREATE INDEX idx_issue_labels_issue ON issue_labels(issue_id);
CREATE INDEX idx_issue_labels_label ON issue_labels(label_id);

-- ============================================
-- SUBTASKS
-- ============================================

CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_done BOOLEAN DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subtasks_issue ON subtasks(issue_id);

-- ============================================
-- DEPENDENCIES
-- Issue A (blocker) blocks Issue B (blocked)
-- ============================================

CREATE TABLE dependencies (
  blocker_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_dependencies_blocker ON dependencies(blocker_id);
CREATE INDEX idx_dependencies_blocked ON dependencies(blocked_id);

-- ============================================
-- COMMENTS
-- ============================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES users(id) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_issue ON comments(issue_id);

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES users(id) NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_project ON audit_log(project_id);
CREATE INDEX idx_audit_log_issue ON audit_log(issue_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's app user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM users WHERE auth_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users: Everyone can read all users (for assignee dropdowns, etc.)
CREATE POLICY "Users are viewable by authenticated users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Users: Only allow insert for the current auth user (self-registration)
CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

-- Users: Only allow update of own record
CREATE POLICY "Users can update their own record"
  ON users FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid());

-- PATs: Users can only see and manage their own tokens
CREATE POLICY "Users manage own tokens"
  ON personal_access_tokens FOR ALL
  TO authenticated
  USING (user_id = get_current_user_id())
  WITH CHECK (user_id = get_current_user_id());

-- Projects: All authenticated users can read
CREATE POLICY "Projects are viewable by authenticated users"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

-- Projects: All authenticated users can create/update
CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true);

-- Labels: All authenticated users can read and manage
CREATE POLICY "Labels are viewable by authenticated users"
  ON labels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage labels"
  ON labels FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Issues: All authenticated users can read and manage
CREATE POLICY "Issues are viewable by authenticated users"
  ON issues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage issues"
  ON issues FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Issue Labels: All authenticated users can manage
CREATE POLICY "Issue labels are manageable by authenticated users"
  ON issue_labels FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Subtasks: All authenticated users can manage
CREATE POLICY "Subtasks are manageable by authenticated users"
  ON subtasks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Dependencies: All authenticated users can manage
CREATE POLICY "Dependencies are manageable by authenticated users"
  ON dependencies FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comments: All authenticated users can read, create, update own
CREATE POLICY "Comments are viewable by authenticated users"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (author_id = get_current_user_id());

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (author_id = get_current_user_id());

-- Audit Log: All authenticated users can read, system creates entries
CREATE POLICY "Audit log is viewable by authenticated users"
  ON audit_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create audit entries"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- SERVICE ROLE POLICIES
-- For API endpoints using service role key
-- ============================================

-- Service role can do everything (for API token auth)
CREATE POLICY "Service role has full access to users"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to personal_access_tokens"
  ON personal_access_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to projects"
  ON projects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to labels"
  ON labels FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to issues"
  ON issues FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to issue_labels"
  ON issue_labels FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to subtasks"
  ON subtasks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to dependencies"
  ON dependencies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to comments"
  ON comments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to audit_log"
  ON audit_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- HELPER FUNCTION: Create user on first login
-- Called from Next.js auth callback
-- ============================================

CREATE OR REPLACE FUNCTION create_user_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (auth_id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user record on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_on_signup();
