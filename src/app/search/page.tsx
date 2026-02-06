import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/header'
import { SearchForm } from '@/components/search-form'
import type { User, Label, Issue, Project } from '@/types/database'

interface IssueWithRelations extends Issue {
  project: Project
  assignee: User | null
  labels: { label: Label }[]
}

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get current user's app profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single()

  // Get needs attention count for header
  const { count: needsAttentionCount } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .eq('needs_attention', true)

  let issues: IssueWithRelations[] = []

  if (q && q.trim()) {
    // Search issues by title
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('issues')
      .select(`
        *,
        project:projects(id, name, slug, is_archived),
        assignee:users!issues_assignee_id_fkey(id, name, avatar_url, is_bot),
        labels:issue_labels(
          label:labels(*)
        )
      `)
      .ilike('title', `%${q}%`)
      .order('updated_at', { ascending: false })
      .limit(50)

    issues = data || []
  }

  return (
    <div className="min-h-screen">
      <Header user={profile as User | null} needsAttentionCount={needsAttentionCount || 0} />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-4">Search</h1>
          <SearchForm initialQuery={q || ''} />
        </div>

        {q && (
          <div className="mb-4 text-slate-400">
            {issues.length} result{issues.length !== 1 ? 's' : ''} for &quot;{q}&quot;
          </div>
        )}

        {q && issues.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold mb-2">No results found</h2>
            <p className="text-slate-400">
              Try a different search term.
            </p>
          </div>
        )}

        {issues.length > 0 && (
          <div className="space-y-2">
            {issues.map(issue => (
              <Link
                key={issue.id}
                href={`/${issue.project.slug}/issues/${issue.number}`}
                className="card p-4 flex items-center gap-4 hover:border-indigo-500/50 transition-colors"
              >
                {/* Issue ID */}
                <span className="text-sm font-mono text-slate-500 w-24 flex-shrink-0">
                  {issue.project.slug.toUpperCase()}-{issue.number}
                </span>

                {/* Title */}
                <span className="flex-1 truncate">
                  {issue.title}
                </span>

                {/* Project badge */}
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                  {issue.project.name}
                  {issue.project.is_archived && ' (archived)'}
                </span>

                {/* Status */}
                <span className={`status-badge status-${issue.status.replace('_', '-')}`}>
                  {issue.status.replace('_', ' ')}
                </span>

                {/* Attention indicator */}
                {issue.needs_attention && (
                  <span className="text-red-400" title="Needs Attention">
                    🔔
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        {!q && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold mb-2">Search issues</h2>
            <p className="text-slate-400">
              Enter a search term to find issues across all projects.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
