'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { Project, User, AuditLog, Issue } from '@/types/database'

interface ActivityWithRelations extends AuditLog {
  actor: User
  issue: Pick<Issue, 'id' | 'number' | 'title'> | null
}

interface ActivityFeedProps {
  activities: ActivityWithRelations[]
  project: Project
}

function getActionDescription(action: string, details: Record<string, unknown> | null): string {
  switch (action) {
    case 'issue_created':
      return 'created issue'
    case 'issue_updated':
      if (details?.status) {
        const status = details.status as { from: string; to: string }
        return `changed status from ${status.from} to ${status.to}`
      }
      if (details?.assignee_id) {
        return 'changed assignee'
      }
      if (details?.priority) {
        const priority = details.priority as { from: string; to: string }
        return `changed priority from ${priority.from} to ${priority.to}`
      }
      if (details?.title) {
        return 'updated title'
      }
      if (details?.description) {
        return 'updated description'
      }
      if (details?.needs_attention !== undefined) {
        return details.needs_attention ? 'flagged for attention' : 'cleared attention flag'
      }
      return 'updated issue'
    case 'issue_deleted':
      return `deleted issue ${details?.number ? `#${details.number}` : ''}`
    case 'comment_added':
      if (details?.blocked_reason) {
        return 'added blocked reason'
      }
      return 'commented'
    case 'subtask_added':
      return 'added subtask'
    case 'subtask_completed':
      return 'completed subtask'
    case 'subtask_unchecked':
      return 'unchecked subtask'
    case 'dependency_added':
      return 'added dependency'
    case 'dependency_removed':
      return 'removed dependency'
    case 'label_added':
      return 'added label'
    case 'label_removed':
      return 'removed label'
    default:
      return action.replace(/_/g, ' ')
  }
}

function getActionIcon(action: string): string {
  switch (action) {
    case 'issue_created':
      return '➕'
    case 'issue_updated':
      return '✏️'
    case 'issue_deleted':
      return '🗑️'
    case 'comment_added':
      return '💬'
    case 'subtask_added':
    case 'subtask_completed':
    case 'subtask_unchecked':
      return '☑️'
    case 'dependency_added':
    case 'dependency_removed':
      return '🔗'
    case 'label_added':
    case 'label_removed':
      return '🏷️'
    default:
      return '📝'
  }
}

export function ActivityFeed({ activities, project }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-4xl mb-4">📭</div>
        <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
        <p className="text-slate-400">
          Activity will appear here when issues are created or updated.
        </p>
      </div>
    )
  }

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.created_at).toLocaleDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(activity)
    return groups
  }, {} as Record<string, ActivityWithRelations[]>)

  return (
    <div className="space-y-8">
      {Object.entries(groupedActivities).map(([date, dayActivities]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-slate-500 mb-4">{date}</h3>
          <div className="space-y-3">
            {dayActivities.map(activity => (
              <div 
                key={activity.id}
                className="card p-4 flex items-start gap-4"
              >
                {/* Actor avatar */}
                <div className="flex-shrink-0">
                  {activity.actor?.avatar_url ? (
                    <img 
                      src={activity.actor.avatar_url} 
                      alt={activity.actor.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-medium">
                      {activity.actor?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                {/* Activity content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {activity.actor?.name || 'Unknown'}
                      {activity.actor?.is_bot && ' 🤖'}
                    </span>
                    <span className="text-slate-400">
                      {getActionIcon(activity.action)}{' '}
                      {getActionDescription(activity.action, activity.details as Record<string, unknown>)}
                    </span>
                    {activity.issue && (
                      <Link
                        href={`/${project.slug}/issues/${activity.issue.number}`}
                        className="text-indigo-400 hover:text-indigo-300"
                      >
                        {project.slug.toUpperCase()}-{activity.issue.number}
                      </Link>
                    )}
                  </div>

                  {/* Issue title if available */}
                  {activity.issue?.title && (
                    <p className="text-sm text-slate-500 mt-1 truncate">
                      {activity.issue.title}
                    </p>
                  )}

                  {/* Timestamp */}
                  <p className="text-xs text-slate-600 mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
