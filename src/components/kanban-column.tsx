'use client'

import { useDroppable } from '@dnd-kit/core'
import { IssueCard } from './issue-card'
import { QuickAddCard } from './quick-add-card'
import type { Project, IssueWithRelations, IssueStatus, Priority } from '@/types/database'

interface KanbanColumnProps {
  id: IssueStatus
  title: string
  color: string
  issues: IssueWithRelations[]
  project: Project
  onQuickAdd: (title: string, priority?: Priority) => void
}

export function KanbanColumn({ id, title, color, issues, project, onQuickAdd }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

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
        <QuickAddCard onAdd={onQuickAdd} />
      </div>

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
