'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'

interface HeaderProps {
  user: User | null
  needsAttentionCount?: number
}

export function Header({ user, needsAttentionCount = 0 }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-indigo-400">
            Slate
          </Link>
          
          <nav className="flex items-center gap-4">
            <Link 
              href="/" 
              className="text-slate-300 hover:text-white transition-colors"
            >
              Projects
            </Link>
            <Link 
              href="/attention" 
              className="text-slate-300 hover:text-white transition-colors flex items-center gap-2"
            >
              🙋 Input Needed
              {needsAttentionCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {needsAttentionCount}
                </span>
              )}
            </Link>
            <Link 
              href="/labels" 
              className="text-slate-300 hover:text-white transition-colors"
            >
              Labels
            </Link>
            <Link 
              href="/search" 
              className="text-slate-300 hover:text-white transition-colors"
            >
              Search
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <Link 
                href="/settings/profile"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                title="Profile settings"
              >
                {user.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-slate-300">{user.name}</span>
              </Link>
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
