export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type IssueStatus = 'backlog' | 'ready' | 'in_progress' | 'blocked' | 'done'
export type Priority = 'low' | 'medium' | 'high' | 'critical'

// Simplified database type that allows flexibility until we generate from Supabase
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Partial<User> & { name: string }
        Update: Partial<User>
      }
      personal_access_tokens: {
        Row: PersonalAccessToken
        Insert: Omit<PersonalAccessToken, 'id' | 'created_at'>
        Update: Partial<PersonalAccessToken>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'is_archived'> & { is_archived?: boolean }
        Update: Partial<Project>
      }
      labels: {
        Row: Label
        Insert: Omit<Label, 'id' | 'created_at'> & { color?: string }
        Update: Partial<Label>
      }
      issues: {
        Row: Issue
        Insert: Omit<Issue, 'id' | 'number' | 'created_at' | 'updated_at'> & {
          number?: number
          status?: IssueStatus
          priority?: Priority
          needs_attention?: boolean
        }
        Update: Partial<Issue>
      }
      issue_labels: {
        Row: IssueLabel
        Insert: IssueLabel
        Update: Partial<IssueLabel>
      }
      subtasks: {
        Row: Subtask
        Insert: Omit<Subtask, 'id' | 'created_at'> & { is_done?: boolean; position?: number }
        Update: Partial<Subtask>
      }
      dependencies: {
        Row: Dependency
        Insert: Omit<Dependency, 'created_at'>
        Update: Partial<Dependency>
      }
      comments: {
        Row: Comment
        Insert: Omit<Comment, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Comment>
      }
      audit_log: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: Partial<AuditLog>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Core types
export interface User {
  id: string
  auth_id: string | null
  email: string | null
  name: string
  avatar_url: string | null
  is_bot: boolean
  created_at: string
}

export interface PersonalAccessToken {
  id: string
  user_id: string
  token_hash: string
  name: string
  last_used_at: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  slug: string
  description: string | null
  is_archived: boolean
  default_assignee_id: string | null
  created_at: string
  updated_at: string
}

export interface Label {
  id: string
  name: string
  color: string
  created_at: string
}

export interface Issue {
  id: string
  project_id: string
  number: number
  title: string
  description: string | null
  status: IssueStatus
  priority: Priority
  needs_attention: boolean
  assignee_id: string | null
  due_date: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface IssueLabel {
  issue_id: string
  label_id: string
}

export interface Subtask {
  id: string
  issue_id: string
  title: string
  is_done: boolean
  position: number
  created_at: string
}

export interface Dependency {
  blocker_id: string
  blocked_id: string
  created_at: string
}

export interface Comment {
  id: string
  issue_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  project_id: string | null
  issue_id: string | null
  actor_id: string
  action: string
  details: Json | null
  created_at: string
}

// Extended types with relations
export interface IssueWithRelations extends Issue {
  project?: Project
  assignee?: User | null
  created_by_user?: User
  labels?: Label[]
  subtasks?: Subtask[]
  comments?: Comment[]
  blockers?: Issue[]
  blocking?: Issue[]
}

export interface ProjectWithStats extends Project {
  issue_count?: number
  open_count?: number
  needs_attention_count?: number
}
