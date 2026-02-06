'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Project, Issue } from '@/types/database'

interface IssueWithProject extends Issue {
  project?: { slug: string }
}

interface DependencyListProps {
  issue: Issue
  blockedBy: IssueWithProject[]
  blocking: IssueWithProject[]
  project: Project
  onUpdate: () => void
}

export function DependencyList({ issue, blockedBy, blocking, project, onUpdate }: DependencyListProps) {
  const [isAdding, setIsAdding] = useState<'blockedBy' | 'blocking' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Issue[]>([])
  const [searching, setSearching] = useState(false)
  const supabase = createClient()

  const searchIssues = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)

    // Search by issue number or title
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('issues')
      .select('*')
      .eq('project_id', project.id)
      .neq('id', issue.id)
      .or(`title.ilike.%${query}%,number.eq.${parseInt(query) || 0}`)
      .limit(10)

    // Filter out already linked issues
    const existingIds = new Set([
      ...blockedBy.map(i => i.id),
      ...blocking.map(i => i.id),
    ])
    setSearchResults((data || []).filter((i: Issue) => !existingIds.has(i.id)))
    setSearching(false)
  }

  const addDependency = async (targetIssue: Issue) => {
    if (!isAdding) return

    const dependency = isAdding === 'blockedBy'
      ? { blocker_id: targetIssue.id, blocked_id: issue.id }
      : { blocker_id: issue.id, blocked_id: targetIssue.id }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('dependencies')
      .insert(dependency)

    setIsAdding(null)
    setSearchQuery('')
    setSearchResults([])
    onUpdate()
  }

  const removeDependency = async (blockerId: string, blockedId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('dependencies')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)

    onUpdate()
  }

  const renderIssueLink = (linkedIssue: IssueWithProject, type: 'blockedBy' | 'blocking') => {
    const slug = linkedIssue.project?.slug || project.slug
    const issueId = `${slug.toUpperCase()}-${linkedIssue.number}`
    
    return (
      <div 
        key={linkedIssue.id}
        className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 group"
      >
        <Link 
          href={`/${slug}/issues/${linkedIssue.number}`}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <span className="text-xs font-mono text-slate-500">{issueId}</span>
          <span className={`text-sm truncate ${linkedIssue.status === 'done' ? 'line-through text-slate-500' : ''}`}>
            {linkedIssue.title}
          </span>
        </Link>
        <button
          onClick={() => removeDependency(
            type === 'blockedBy' ? linkedIssue.id : issue.id,
            type === 'blockedBy' ? issue.id : linkedIssue.id
          )}
          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 ml-2"
          title="Remove dependency"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-400 mb-4">Dependencies</h3>

      {/* Blocked By */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Blocked by</span>
          <button
            onClick={() => {
              setIsAdding(isAdding === 'blockedBy' ? null : 'blockedBy')
              setSearchQuery('')
              setSearchResults([])
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            {isAdding === 'blockedBy' ? 'Cancel' : '+ Add'}
          </button>
        </div>
        
        {blockedBy.length > 0 ? (
          <div className="space-y-1">
            {blockedBy.map(i => renderIssueLink(i, 'blockedBy'))}
          </div>
        ) : (
          <p className="text-sm text-slate-600 italic">No blockers</p>
        )}

        {isAdding === 'blockedBy' && (
          <div className="mt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                searchIssues(e.target.value)
              }}
              placeholder="Search by title or number..."
              className="input text-sm"
              autoFocus
            />
            {searchResults.length > 0 && (
              <div className="mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                {searchResults.map(result => (
                  <button
                    key={result.id}
                    onClick={() => addDependency(result)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-800 flex items-center gap-2"
                  >
                    <span className="text-xs font-mono text-slate-500">
                      {project.slug.toUpperCase()}-{result.number}
                    </span>
                    <span className="truncate">{result.title}</span>
                  </button>
                ))}
              </div>
            )}
            {searching && <p className="text-xs text-slate-500 mt-1">Searching...</p>}
          </div>
        )}
      </div>

      {/* Blocking */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 uppercase tracking-wide">Blocking</span>
          <button
            onClick={() => {
              setIsAdding(isAdding === 'blocking' ? null : 'blocking')
              setSearchQuery('')
              setSearchResults([])
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            {isAdding === 'blocking' ? 'Cancel' : '+ Add'}
          </button>
        </div>
        
        {blocking.length > 0 ? (
          <div className="space-y-1">
            {blocking.map(i => renderIssueLink(i, 'blocking'))}
          </div>
        ) : (
          <p className="text-sm text-slate-600 italic">Not blocking anything</p>
        )}

        {isAdding === 'blocking' && (
          <div className="mt-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                searchIssues(e.target.value)
              }}
              placeholder="Search by title or number..."
              className="input text-sm"
              autoFocus
            />
            {searchResults.length > 0 && (
              <div className="mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                {searchResults.map(result => (
                  <button
                    key={result.id}
                    onClick={() => addDependency(result)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-800 flex items-center gap-2"
                  >
                    <span className="text-xs font-mono text-slate-500">
                      {project.slug.toUpperCase()}-{result.number}
                    </span>
                    <span className="truncate">{result.title}</span>
                  </button>
                ))}
              </div>
            )}
            {searching && <p className="text-xs text-slate-500 mt-1">Searching...</p>}
          </div>
        )}
      </div>
    </div>
  )
}
