import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/header'
import { formatDistanceToNow } from 'date-fns'
import type { User, Project } from '@/types/database'

interface ProjectWithCounts extends Project {
  issues: { count: number }[]
}

export default async function ArchivedPage() {
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

  // Get archived projects
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      *,
      issues:issues(count)
    `)
    .eq('is_archived', true)
    .order('updated_at', { ascending: false })

  return (
    <div className="min-h-screen">
      <Header user={profile as User | null} needsAttentionCount={needsAttentionCount || 0} />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Archived Projects</h1>
            <p className="text-slate-400 mt-1">
              {projects?.length || 0} archived project{projects?.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <Link href="/" className="text-indigo-400 hover:text-indigo-300">
            ← Back to active projects
          </Link>
        </div>

        {projects?.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-4">📦</div>
            <h2 className="text-xl font-semibold mb-2">No archived projects</h2>
            <p className="text-slate-400">
              When you archive a project, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(projects as ProjectWithCounts[])?.map((project) => {
              const issueCount = project.issues?.[0]?.count ?? 0
              
              return (
                <Link
                  key={project.id}
                  href={`/${project.slug}`}
                  className="card p-6 flex items-center gap-6 hover:border-indigo-500/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold">
                        {project.name}
                      </h3>
                      <span className="text-xs text-slate-500 font-mono uppercase bg-slate-800 px-2 py-0.5 rounded">
                        {project.slug}
                      </span>
                      <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                        Archived
                      </span>
                    </div>
                    
                    {project.description && (
                      <p className="text-slate-400 text-sm truncate">
                        {project.description}
                      </p>
                    )}
                  </div>

                  <div className="text-right text-sm text-slate-500 flex-shrink-0">
                    <div>{issueCount} issue{issueCount !== 1 ? 's' : ''}</div>
                    <div>Archived {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
