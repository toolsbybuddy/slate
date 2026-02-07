'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import type { Project, IssueWithRelations } from '@/types/database'

interface IssueCardProps {
  issue: IssueWithRelations
  project: Project
  isDragging?: boolean
}

export function IssueCard({ issue, project, isDragging = false }: IssueCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: issue.id,
  })

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined

  const issueId = `${project.slug.toUpperCase()}-${issue.number}`

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`issue-card ${isDragging ? 'dragging' : ''} ${issue.needs_attention ? 'needs-attention' : ''}`}
    >
      <Link 
        href={`/${project.slug}/issues/${issue.number}`}
        className="block"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with ID and priority */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-slate-500">{issueId}</span>
          <span className={`priority-badge priority-${issue.priority}`}>
            {issue.priority}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-medium text-sm mb-2 line-clamp-2">
          {issue.title}
        </h4>

        {/* Labels */}
        {issue.labels && issue.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {issue.labels.slice(0, 3).map(label => (
              <span
                key={label.id}
                className="label-chip"
                style={{ 
                  backgroundColor: `${label.color}20`,
                  color: label.color 
                }}
              >
                {label.name}
              </span>
            ))}
            {issue.labels.length > 3 && (
              <span className="text-xs text-slate-500">
                +{issue.labels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer with assignee and due date */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
          {issue.assignee ? (
            <div className="flex items-center gap-1.5">
              {issue.assignee.avatar_url ? (
                <img 
                  src={issue.assignee.avatar_url} 
                  alt={issue.assignee.name}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-medium">
                  {issue.assignee.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs text-slate-400">
                {issue.assignee.name}
                {issue.assignee.is_bot && ' 🤖'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">Unassigned</span>
          )}

          {issue.due_date && (
            <span className={`text-xs ${
              new Date(issue.due_date) < new Date() ? 'text-red-400' : 'text-slate-500'
            }`}>
              {new Date(issue.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}
