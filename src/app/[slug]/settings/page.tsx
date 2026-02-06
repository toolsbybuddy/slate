import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectSettings } from '@/components/project-settings'
import type { Project, User } from '@/types/database'

interface SettingsPageProps {
  params: Promise<{ slug: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
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
                {(project as Project).is_archived && (
                  <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                    Archived
                  </span>
                )}
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
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Activity
            </Link>
            <Link 
              href={`/${slug}/settings`}
              className="px-3 py-1.5 text-sm font-medium text-white bg-slate-800 rounded"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-lg font-semibold mb-6">Project Settings</h2>
        <ProjectSettings project={project as Project} />
      </main>
    </div>
  )
}
