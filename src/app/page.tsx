import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectList } from '@/components/project-list'
import { Header } from '@/components/header'
import type { User } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user's app profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single()

  // Get projects with issue counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      issues:issues(count)
    `)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  // Get global needs attention count
  const { count: needsAttentionCount } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .eq('needs_attention', true)

  return (
    <div className="min-h-screen">
      <Header user={profile as User | null} needsAttentionCount={needsAttentionCount || 0} />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-slate-400 mt-1">
              {projects?.length || 0} active project{projects?.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <Link href="/projects/new" className="btn btn-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Link>
        </div>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <ProjectList projects={(projects as any[]) || []} />

        {projects?.length === 0 && (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-slate-400 mb-6">
              Create your first project to start tracking issues.
            </p>
            <Link href="/projects/new" className="btn btn-primary">
              Create a Project
            </Link>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link href="/archived" className="text-slate-400 hover:text-slate-300 text-sm">
            View archived projects →
          </Link>
        </div>
      </main>
    </div>
  )
}
