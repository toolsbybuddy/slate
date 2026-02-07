'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { IssueCard } from './issue-card'
import { QuickAddButton, QuickAddInput } from './quick-add-card'
import type { Project, IssueWithRelations, IssueStatus, Priority, SortOption } from '@/types/database'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'due_date', label: 'Due Date' },
]

interface KanbanColumnProps {
  id: IssueStatus
  title: string
  color: string
  issues: IssueWithRelations[]
  project: Project
  onQuickAdd: (title: string, priority?: Priority) => void
  sortBy: SortOption
  onSortChange: (sortBy: SortOption) => void
}

export function KanbanColumn({ id, title, color, issues, project, onQuickAdd, sortBy, onSortChange }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const [isAddingIssue, setIsAddingIssue] = useState(false)

  return (
    <div 
      ref={setNodeRef}
      className={`kanban-column ${isOver ? 'ring-2 ring-indigo-500/50' : ''}`}
    >
      <div className="kanban-column-header">
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: color }}
          />
          <h3 className="font-semibold">{title}</h3>
          <span className="text-slate-500 text-sm">({issues.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-transparent text-slate-400 text-xs border-none focus:outline-none cursor-pointer hover:text-white"
            title="Sort by"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-slate-800">
                {opt.label}
              </option>
            ))}
          </select>
          <QuickAddButton onClick={() => setIsAddingIssue(true)} />
        </div>
      </div>

      {/* Quick-add input - full width below header */}
      {isAddingIssue && (
        <QuickAddInput
          onAdd={onQuickAdd}
          onCancel={() => setIsAddingIssue(false)}
        />
      )}

      <div className="kanban-column-content">
        {issues.map(issue => (
          <IssueCard 
            key={issue.id} 
            issue={issue} 
            project={project}
          />
        ))}
        
        {issues.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No issues
          </div>
        )}
      </div>
    </div>
  )
}
