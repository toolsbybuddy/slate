import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { IssueDetail } from '@/components/issue-detail'
import type { Project, User, Label, Issue, Subtask, Comment } from '@/types/database'

interface IssuePageProps {
  params: Promise<{ slug: string; number: string }>
}

export default async function IssuePage({ params }: IssuePageProps) {
  const { slug, number } = await params
  const issueNumber = parseInt(number, 10)
  
  if (isNaN(issueNumber)) {
    notFound()
  }

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get current user's app profile
  const { data: currentUser } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single()

  if (!currentUser) {
    redirect('/login')
  }

  // Get project by slug
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single()

  if (projectError || !project) {
    notFound()
  }

  // Get issue by number within project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: issue, error: issueError } = await (supabase as any)
    .from('issues')
    .select(`
      *,
      assignee:users!issues_assignee_id_fkey(*),
      created_by_user:users!issues_created_by_fkey(*),
      labels:issue_labels(
        label:labels(*)
      ),
      subtasks(*),
      comments(
        *,
        author:users(*)
      )
    `)
    .eq('project_id', (project as Project).id)
    .eq('number', issueNumber)
    .single()

  if (issueError || !issue) {
    notFound()
  }

  // Get blockers (issues this one is blocked by)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: blockedByData } = await (supabase as any)
    .from('dependencies')
    .select(`
      blocker:issues!dependencies_blocker_id_fkey(
        *,
        project:projects(slug)
      )
    `)
    .eq('blocked_id', issue.id)

  // Get blocking (issues this one blocks)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: blockingData } = await (supabase as any)
    .from('dependencies')
    .select(`
      blocked:issues!dependencies_blocked_id_fkey(
        *,
        project:projects(slug)
      )
    `)
    .eq('blocker_id', issue.id)

  // Get all users for assignee dropdown (exclude soft-deleted)
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('is_deleted', false)
    .order('name')

  // Get all labels
  const { data: labels } = await supabase
    .from('labels')
    .select('*')
    .order('name')

  // Transform the data
  const transformedIssue = {
    ...issue,
    labels: issue.labels?.map((il: { label: Label }) => il.label) || [],
    subtasks: issue.subtasks || [],
    comments: (issue.comments || []).sort((a: Comment, b: Comment) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
    blockedBy: blockedByData?.map((d: { blocker: Issue }) => d.blocker) || [],
    blocking: blockingData?.map((d: { blocked: Issue }) => d.blocked) || [],
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href={`/${slug}`}
              className="text-slate-400 hover:text-white flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to board
            </Link>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">{(project as Project).name}</span>
          </div>

          {currentUser && (
            <Link 
              href="/settings/profile"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              title="Profile settings"
            >
              {(currentUser as User).avatar_url ? (
                <img 
                  src={(currentUser as User).avatar_url!} 
                  alt={(currentUser as User).name} 
                  className="w-7 h-7 rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-medium">
                  {(currentUser as User).name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm text-slate-300">{(currentUser as User).name}</span>
            </Link>
          )}
        </div>
      </header>

      {/* Issue Detail */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <IssueDetail
          issue={transformedIssue}
          project={project as Project}
          users={(users as User[]) || []}
          labels={(labels as Label[]) || []}
          currentUser={currentUser as unknown as User}
        />
      </main>
    </div>
  )
}
