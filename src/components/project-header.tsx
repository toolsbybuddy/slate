'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Project, User } from '@/types/database'

interface ProjectHeaderProps {
  project: Project
  currentUser: User | null
}

export function ProjectHeader({ project, currentUser }: ProjectHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-indigo-400 hover:text-indigo-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{project.name}</h1>
              <span className="text-xs text-slate-500 font-mono uppercase bg-slate-800 px-2 py-0.5 rounded">
                {project.slug}
              </span>
              {project.is_archived && (
                <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                  Archived
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-sm text-slate-400 mt-1">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-2">
            <Link 
              href={`/${project.slug}`}
              className="px-3 py-1.5 text-sm font-medium text-white bg-slate-800 rounded"
            >
              Board
            </Link>
            <Link 
              href={`/${project.slug}/activity`}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Activity
            </Link>
            <Link 
              href={`/${project.slug}/settings`}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Settings
            </Link>
          </nav>

          <div className="h-6 w-px bg-slate-700" />

          {currentUser && (
            <div className="flex items-center gap-3">
              {currentUser.avatar_url ? (
                <img 
                  src={currentUser.avatar_url} 
                  alt={currentUser.name} 
                  className="w-7 h-7 rounded-full"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-medium">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <button 
                onClick={handleSignOut}
                className="text-slate-400 hover:text-white text-sm"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
