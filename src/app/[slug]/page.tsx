import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ProjectHeader } from '@/components/project-header'
import { KanbanBoard } from '@/components/kanban-board'
import type { Project, User, Label, IssueWithRelations } from '@/types/database'

interface ProjectPageProps {
  params: Promise<{ slug: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params
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

  // Get project by slug
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !project) {
    notFound()
  }

  // Get all issues for this project with assignee info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: issues } = await supabase
    .from('issues')
    .select(`
      *,
      assignee:users!issues_assignee_id_fkey(*),
      labels:issue_labels(
        label:labels(*)
      )
    `)
    .eq('project_id', (project as Project).id)
    .order('updated_at', { ascending: false })

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

  // Transform issues to flatten labels
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformedIssues: IssueWithRelations[] = (issues as any[])?.map((issue: any) => ({
    ...issue,
    labels: issue.labels?.map((il: { label: Label }) => il.label) || []
  })) || []

  return (
    <div className="min-h-screen flex flex-col">
      <ProjectHeader 
        project={project as Project} 
        currentUser={currentUser as User | null}
      />
      
      <main className="flex-1 p-4 overflow-hidden">
        <KanbanBoard 
          project={project as Project}
          issues={transformedIssues}
          users={(users as User[]) || []}
          labels={(labels as Label[]) || []}
          currentUser={currentUser as User | null}
        />
      </main>
    </div>
  )
}
