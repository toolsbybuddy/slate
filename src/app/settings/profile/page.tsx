import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { ProfileSettings } from '@/components/profile-settings'
import type { User } from '@/types/database'

export default async function ProfileSettingsPage() {
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

  if (!profile) {
    redirect('/login')
  }

  // Get needs attention count for header
  const { count: needsAttentionCount } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .eq('needs_attention', true)

  return (
    <div className="min-h-screen">
      <Header user={profile as User | null} needsAttentionCount={needsAttentionCount || 0} />
      
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Profile Settings</h1>
          <p className="text-slate-400">
            Manage your display name and avatar.
          </p>
        </div>

        <ProfileSettings user={profile as User} />
      </main>
    </div>
  )
}
