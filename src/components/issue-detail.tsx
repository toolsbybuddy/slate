'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StatusSelect } from './status-select'
import { PrioritySelect } from './priority-select'
import { AssigneeSelect } from './assignee-select'
import { LabelSelect } from './label-select'
import { ResolutionSelect } from './resolution-select'
import { SubtaskList } from './subtask-list'
import { CommentThread } from './comment-thread'
import { DependencyList } from './dependency-list'
import type { Project, User, Label, Issue, Subtask, Comment, IssueStatus, Priority, Resolution } from '@/types/database'

interface IssueWithRelations extends Issue {
  assignee?: User | null
  created_by_user?: User
  labels: Label[]
  subtasks: Subtask[]
  comments: (Comment & { author: User })[]
  blockedBy: (Issue & { project?: { slug: string } })[]
  blocking: (Issue & { project?: { slug: string } })[]
}

interface IssueDetailProps {
  issue: IssueWithRelations
  project: Project
  users: User[]
  labels: Label[]
  currentUser: User
}

export function IssueDetail({ issue: initialIssue, project, users, labels, currentUser }: IssueDetailProps) {
  const router = useRouter()
  const supabase = createClient()
  const isReadOnly = project.is_archived
  
  const [issue, setIssue] = useState(initialIssue)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(issue.description || '')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const issueId = `${project.slug.toUpperCase()}-${issue.number}`

  const updateIssue = async (updates: Partial<Issue>) => {
    setSaving(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('issues')
      .update(updates)
      .eq('id', issue.id)

    if (!error) {
      setIssue(prev => ({ ...prev, ...updates }))
    }
    setSaving(false)
    router.refresh()
  }

  const handleTitleSave = async () => {
    if (title.trim() && title !== issue.title) {
      await updateIssue({ title: title.trim() })
    }
    setIsEditingTitle(false)
  }

  const handleDescriptionSave = async () => {
    if (description !== issue.description) {
      await updateIssue({ description: description || null })
    }
    setIsEditingDescription(false)
  }

  const handleStatusChange = async (status: IssueStatus) => {
    await updateIssue({ status })
  }

  const handlePriorityChange = async (priority: Priority) => {
    await updateIssue({ priority })
  }

  const handleAssigneeChange = async (assigneeId: string | null) => {
    await updateIssue({ assignee_id: assigneeId })
  }

  const handleNeedsAttentionChange = async () => {
    await updateIssue({ needs_attention: !issue.needs_attention })
  }

  const handleDueDateChange = async (date: string | null) => {
    await updateIssue({ due_date: date })
  }

  const handleResolutionChange = async (resolution: Resolution | null) => {
    await updateIssue({ resolution })
  }

  const handleDelete = async () => {
    setDeleting(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('issues')
      .delete()
      .eq('id', issue.id)

    if (!error) {
      router.push(`/${project.slug}`)
    } else {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Read-only banner for archived projects */}
      {isReadOnly && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2 text-amber-400">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm">This project is archived. Issues are read-only.</span>
        </div>
      )}

      {/* Issue ID and Status Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">
            {issueId}
          </span>
          {isReadOnly ? (
            <span className={`status-badge status-${issue.status.replace('_', '-')}`}>
              {issue.status.replace('_', ' ')}
            </span>
          ) : (
            <StatusSelect value={issue.status} onChange={handleStatusChange} />
          )}
          {!isReadOnly && issue.status === 'done' && (
            <ResolutionSelect value={issue.resolution} onChange={handleResolutionChange} />
          )}
        </div>
        
        {saving && (
          <span className="text-sm text-slate-500">Saving...</span>
        )}
      </div>

      {/* Title */}
      <div>
        {!isReadOnly && isEditingTitle ? (
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
            className="text-2xl font-bold bg-transparent border-b-2 border-indigo-500 w-full focus:outline-none"
            autoFocus
          />
        ) : (
          <h1 
            className={`text-2xl font-bold ${!isReadOnly ? 'cursor-pointer hover:text-indigo-400 transition-colors' : ''}`}
            onClick={() => !isReadOnly && setIsEditingTitle(true)}
          >
            {issue.title}
          </h1>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-8">
        {/* Left Column - Description, Subtasks, Comments */}
        <div className="col-span-2 space-y-6">
          {/* Description */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Description</h3>
            {!isReadOnly && isEditingDescription ? (
              <div className="space-y-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="input resize-none"
                  placeholder="Add a description..."
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => {
                      setDescription(issue.description || '')
                      setIsEditingDescription(false)
                    }}
                    className="btn btn-ghost text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDescriptionSave}
                    className="btn btn-primary text-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className={`prose prose-invert prose-sm max-w-none ${!isReadOnly ? 'cursor-pointer hover:bg-slate-800/50 transition-colors' : ''} rounded p-2 -m-2`}
                onClick={() => !isReadOnly && setIsEditingDescription(true)}
              >
                {issue.description ? (
                  <p className="whitespace-pre-wrap">{issue.description}</p>
                ) : (
                  <p className="text-slate-500 italic">Click to add description...</p>
                )}
              </div>
            )}
          </div>

          {/* Subtasks */}
          <div className="card p-4">
            <SubtaskList
              issueId={issue.id}
              subtasks={issue.subtasks}
              onUpdate={() => router.refresh()}
              isReadOnly={isReadOnly}
            />
          </div>

          {/* Dependencies */}
          <div className="card p-4">
            <DependencyList
              issue={issue}
              blockedBy={issue.blockedBy}
              blocking={issue.blocking}
              project={project}
              onUpdate={() => router.refresh()}
              isReadOnly={isReadOnly}
            />
          </div>

          {/* Comments */}
          <div className="card p-4">
            <CommentThread
              issueId={issue.id}
              comments={issue.comments}
              currentUser={currentUser}
              users={users}
              onUpdate={() => router.refresh()}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>

        {/* Right Column - Metadata */}
        <div className="space-y-4">
          {/* Assignee */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Assignee</h3>
            {isReadOnly ? (
              <div className="flex items-center gap-2">
                {issue.assignee?.avatar_url ? (
                  <img src={issue.assignee.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                ) : issue.assignee ? (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs">
                    {issue.assignee.name.charAt(0).toUpperCase()}
                  </div>
                ) : null}
                <span className="text-sm">{issue.assignee?.name || 'Unassigned'}</span>
              </div>
            ) : (
              <AssigneeSelect
                value={issue.assignee_id}
                users={users}
                onChange={handleAssigneeChange}
              />
            )}
          </div>

          {/* Priority */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Priority</h3>
            {isReadOnly ? (
              <span className={`priority-badge priority-${issue.priority}`}>
                {issue.priority}
              </span>
            ) : (
              <PrioritySelect value={issue.priority} onChange={handlePriorityChange} />
            )}
          </div>

          {/* Labels */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Labels</h3>
            {isReadOnly ? (
              <div className="flex flex-wrap gap-1">
                {issue.labels.length > 0 ? issue.labels.map(label => (
                  <span
                    key={label.id}
                    className="label-chip"
                    style={{ backgroundColor: `${label.color}20`, color: label.color }}
                  >
                    {label.name}
                  </span>
                )) : (
                  <span className="text-sm text-slate-500">No labels</span>
                )}
              </div>
            ) : (
              <LabelSelect
                issueId={issue.id}
                selectedLabels={issue.labels}
                allLabels={labels}
                onUpdate={() => router.refresh()}
              />
            )}
          </div>

          {/* Flags */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Flags</h3>
            <div className="space-y-2">
              <label className={`flex items-center gap-2 ${isReadOnly ? '' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={issue.needs_attention}
                  onChange={handleNeedsAttentionChange}
                  disabled={isReadOnly}
                  className="rounded border-slate-600 bg-slate-800 text-red-500 focus:ring-red-500 disabled:opacity-50"
                />
                <span className="text-sm">🙋 Human Input Needed</span>
              </label>
            </div>
          </div>

          {/* Due Date */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Due Date</h3>
            {isReadOnly ? (
              <span className="text-sm">{issue.due_date ? new Date(issue.due_date).toLocaleDateString() : 'Not set'}</span>
            ) : (
              <input
                type="date"
                value={issue.due_date || ''}
                onChange={(e) => handleDueDateChange(e.target.value || null)}
                className="input"
              />
            )}
          </div>

          {/* Metadata */}
          <div className="card p-4 text-sm text-slate-500">
            <div className="space-y-1">
              <p>Created by {issue.created_by_user?.name || issue.created_by_user?.email || 'Unknown'}</p>
              <p>Created {new Date(issue.created_at).toLocaleDateString()}</p>
              <p>Updated {new Date(issue.updated_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Danger Zone - hidden for archived projects */}
          {!isReadOnly && (
            <div className="card p-4 border-red-500/30">
              <h3 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h3>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full btn btn-ghost border border-red-500/50 text-red-500 hover:bg-red-500/10 text-sm"
              >
                Delete Issue
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete Issue?</h3>
            <p className="text-slate-400 text-sm mb-4">
              This will permanently delete <strong>{issueId}</strong> and all its subtasks, comments, and history. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? 'Deleting...' : 'Delete Issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
