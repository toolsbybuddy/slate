import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/header'
import type { User, Label, Issue, Project } from '@/types/database'

interface IssueWithRelations extends Issue {
  project: Project
  assignee: User | null
  labels: { label: Label }[]
}

export default async function AttentionPage() {
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

  // Get all issues needing attention across non-archived projects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: issues } = await (supabase as any)
    .from('issues')
    .select(`
      *,
      project:projects!inner(id, name, slug, is_archived),
      assignee:users!issues_assignee_id_fkey(id, name, avatar_url, is_bot),
      labels:issue_labels(
        label:labels(*)
      )
    `)
    .eq('needs_attention', true)
    .eq('projects.is_archived', false)
    .order('updated_at', { ascending: false })

  // Group by project
  const issuesByProject = (issues as IssueWithRelations[] || []).reduce((acc, issue) => {
    const projectId = issue.project.id
    if (!acc[projectId]) {
      acc[projectId] = {
        project: issue.project,
        issues: []
      }
    }
    acc[projectId].issues.push(issue)
    return acc
  }, {} as Record<string, { project: Project; issues: IssueWithRelations[] }>)

  const totalCount = issues?.length || 0

  return (
    <div className="min-h-screen">
      <Header user={profile as User | null} needsAttentionCount={totalCount} />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Needs Attention</h1>
          <p className="text-slate-400">
            {totalCount} issue{totalCount !== 1 ? 's' : ''} flagged across all projects
          </p>
        </div>

        {totalCount === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-semibold mb-2">All clear!</h2>
            <p className="text-slate-400">
              No issues need your attention right now.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.values(issuesByProject).map(({ project, issues: projectIssues }) => (
              <div key={project.id}>
                <div className="flex items-center gap-3 mb-4">
                  <Link 
                    href={`/${project.slug}`}
                    className="text-lg font-semibold hover:text-indigo-400 transition-colors"
                  >
                    {project.name}
                  </Link>
                  <span className="text-xs text-slate-500 font-mono uppercase bg-slate-800 px-2 py-0.5 rounded">
                    {project.slug}
                  </span>
                  <span className="text-sm text-slate-500">
                    ({projectIssues.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {projectIssues.map(issue => (
                    <Link
                      key={issue.id}
                      href={`/${project.slug}/issues/${issue.number}`}
                      className="card p-4 flex items-center gap-4 hover:border-indigo-500/50 transition-colors"
                    >
                      {/* Issue ID */}
                      <span className="text-sm font-mono text-slate-500 w-24 flex-shrink-0">
                        {project.slug.toUpperCase()}-{issue.number}
                      </span>

                      {/* Title */}
                      <span className="flex-1 truncate">
                        {issue.title}
                      </span>

                      {/* Priority */}
                      <span className={`priority-badge priority-${issue.priority}`}>
                        {issue.priority}
                      </span>

                      {/* Status */}
                      <span className={`status-badge status-${issue.status.replace('_', '-')}`}>
                        {issue.status.replace('_', ' ')}
                      </span>

                      {/* Assignee */}
                      {issue.assignee ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
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

                      {/* Attention indicator */}
                      <span className="text-red-400" title="Needs Attention">
                        🔔
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
