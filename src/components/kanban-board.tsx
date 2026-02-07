'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KanbanColumn } from './kanban-column'
import { IssueCard } from './issue-card'
import { QuickAddCard } from './quick-add-card'
import { createClient } from '@/lib/supabase/client'
import type { Project, User, Label, IssueWithRelations, IssueStatus, Priority, SortOption } from '@/types/database'

const COLUMNS: { id: IssueStatus; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'var(--status-backlog)' },
  { id: 'ready', title: 'Ready', color: 'var(--status-ready)' },
  { id: 'in_progress', title: 'In Progress', color: 'var(--status-in-progress)' },
  { id: 'blocked', title: 'Blocked', color: 'var(--status-blocked)' },
  { id: 'done', title: 'Done', color: 'var(--status-done)' },
]

interface KanbanBoardProps {
  project: Project
  issues: IssueWithRelations[]
  users: User[]
  labels: Label[]
  currentUser: User | null
}

// Priority order for sorting (higher = more important)
const PRIORITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

// Default sort per column (Backlog defaults to priority, others to created)
const DEFAULT_SORTS: Record<IssueStatus, SortOption> = {
  backlog: 'priority',
  ready: 'created',
  in_progress: 'created',
  blocked: 'created',
  done: 'updated',
}

function sortIssues(issues: IssueWithRelations[], sortBy: SortOption): IssueWithRelations[] {
  return [...issues].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        // Higher priority first
        return (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0)
      case 'created':
        // Newest first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'updated':
        // Most recently updated first
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      case 'due_date':
        // Earliest due date first, no due date at end
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      default:
        return 0
    }
  })
}

function getStoredSorts(projectId: string): Record<IssueStatus, SortOption> {
  if (typeof window === 'undefined') return DEFAULT_SORTS
  try {
    const stored = localStorage.getItem(`slate-sort-${projectId}`)
    if (stored) {
      return { ...DEFAULT_SORTS, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore localStorage errors
  }
  return DEFAULT_SORTS
}

function storeSorts(projectId: string, sorts: Record<IssueStatus, SortOption>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`slate-sort-${projectId}`, JSON.stringify(sorts))
  } catch {
    // Ignore localStorage errors
  }
}

export function KanbanBoard({ project, issues: initialIssues, users, labels, currentUser }: KanbanBoardProps) {
  const [issues, setIssues] = useState(initialIssues)
  const [activeIssue, setActiveIssue] = useState<IssueWithRelations | null>(null)
  const [filterAssignee, setFilterAssignee] = useState<string | 'all'>('all')
  const [filterLabel, setFilterLabel] = useState<string | 'all'>('all')
  const [columnSorts, setColumnSorts] = useState<Record<IssueStatus, SortOption>>(() => getStoredSorts(project.id))
  
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filter issues
  const filteredIssues = issues.filter(issue => {
    if (filterAssignee !== 'all' && issue.assignee_id !== filterAssignee) {
      return false
    }
    if (filterLabel !== 'all' && !issue.labels?.some(l => l.id === filterLabel)) {
      return false
    }
    return true
  })

  // Group issues by status and sort each column
  const issuesByStatus = COLUMNS.reduce((acc, col) => {
    const columnIssues = filteredIssues.filter(issue => issue.status === col.id)
    acc[col.id] = sortIssues(columnIssues, columnSorts[col.id])
    return acc
  }, {} as Record<IssueStatus, IssueWithRelations[]>)

  const handleSortChange = (status: IssueStatus, sortBy: SortOption) => {
    const newSorts = { ...columnSorts, [status]: sortBy }
    setColumnSorts(newSorts)
    storeSorts(project.id, newSorts)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const issue = issues.find(i => i.id === active.id)
    setActiveIssue(issue || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveIssue(null)

    if (!over) return

    const issueId = active.id as string
    const newStatus = over.id as IssueStatus

    // Find the issue
    const issue = issues.find(i => i.id === issueId)
    if (!issue || issue.status === newStatus) return

    // Optimistic update
    setIssues(prev => prev.map(i => 
      i.id === issueId ? { ...i, status: newStatus } : i
    ))

    // Update in database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('issues')
      .update({ status: newStatus })
      .eq('id', issueId)

    if (error) {
      // Revert on error
      setIssues(prev => prev.map(i => 
        i.id === issueId ? { ...i, status: issue.status } : i
      ))
      console.error('Failed to update issue status:', error)
    }
  }

  const handleQuickAdd = useCallback(async (status: IssueStatus, title: string, priority?: Priority) => {
    if (!currentUser) return

    // Create issue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('issues')
      .insert({
        project_id: project.id,
        title,
        status,
        priority: priority || 'medium',
        created_by: currentUser.id,
        assignee_id: project.default_assignee_id || null,
      })
      .select(`
        *,
        assignee:users!issues_assignee_id_fkey(*)
      `)
      .single()

    if (error) {
      console.error('Failed to create issue:', error)
      return
    }

    // Add to local state
    setIssues(prev => [{ ...data, labels: [] }, ...prev])
  }, [project.id, currentUser, supabase])

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Assignee:</label>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="input py-1 px-2 w-40"
          >
            <option value="all">All</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} {user.is_bot ? '🤖' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Label:</label>
          <select
            value={filterLabel}
            onChange={(e) => setFilterLabel(e.target.value)}
            className="input py-1 px-2 w-40"
          >
            <option value="all">All</option>
            {labels.map(label => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-sm text-slate-500">
          {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Kanban columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {COLUMNS.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              issues={issuesByStatus[column.id]}
              project={project}
              onQuickAdd={(title, priority) => handleQuickAdd(column.id, title, priority)}
              sortBy={columnSorts[column.id]}
              onSortChange={(sortBy) => handleSortChange(column.id, sortBy)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIssue && (
            <IssueCard issue={activeIssue} project={project} isDragging />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
