'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { Project } from '@/types/database'

interface ProjectWithCounts extends Project {
  issues?: { count: number }[]
}

interface ProjectListProps {
  projects: ProjectWithCounts[]
}

export function ProjectList({ projects }: ProjectListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const issueCount = project.issues?.[0]?.count ?? 0
        
        return (
          <Link
            key={project.id}
            href={`/${project.slug}`}
            className="card p-6 hover:border-indigo-500/50 transition-colors group"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold group-hover:text-indigo-400 transition-colors">
                {project.name}
              </h3>
              <span className="text-xs text-slate-500 font-mono uppercase">
                {project.slug}
              </span>
            </div>
            
            {project.description && (
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                {project.description}
              </p>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">
                {issueCount} issue{issueCount !== 1 ? 's' : ''}
              </span>
              <span className="text-slate-500">
                Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
