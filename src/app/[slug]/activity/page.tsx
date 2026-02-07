import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ActivityFeed } from '@/components/activity-feed'
import { ActivityFilters } from '@/components/activity-filters'
import type { Project, User } from '@/types/database'

interface ActivityPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ actor?: string; type?: string }>
}

export default async function ActivityPage({ params, searchParams }: ActivityPageProps) {
  const { slug } = await params
  const { actor, type } = await searchParams
  
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
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

  // Build activity query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('audit_log')
    .select(`
      *,
      actor:users(id, name, avatar_url, is_bot),
      issue:issues(id, number, title)
    `)
    .eq('project_id', (project as Project).id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (actor && actor !== 'all') {
    query = query.eq('actor_id', actor)
  }

  if (type && type !== 'all') {
    query = query.eq('action', type)
  }

  const { data: activities } = await query

  // Get all users for filter dropdown (exclude soft-deleted)
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('is_deleted', false)
    .order('name')

  // Get unique action types from activities
  const actionTypes: string[] = Array.from(new Set((activities || []).map((a: { action: string }) => a.action as string)))

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/${slug}`} className="text-indigo-400 hover:text-indigo-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">{(project as Project).name}</h1>
                <span className="text-xs text-slate-500 font-mono uppercase bg-slate-800 px-2 py-0.5 rounded">
                  {(project as Project).slug}
                </span>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link 
              href={`/${slug}`}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Board
            </Link>
            <Link 
              href={`/${slug}/activity`}
              className="px-3 py-1.5 text-sm font-medium text-white bg-slate-800 rounded"
            >
              Activity
            </Link>
            <Link 
              href={`/${slug}/settings`}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Activity</h2>
          
          <ActivityFilters 
            users={(users as User[]) || []}
            actionTypes={actionTypes}
            projectSlug={(project as Project).slug}
          />
        </div>

        <ActivityFeed 
          activities={activities || []} 
          project={project as Project}
        />
      </main>
    </div>
  )
}
