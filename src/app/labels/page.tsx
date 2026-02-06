import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { LabelsManager } from '@/components/labels-manager'
import type { User, Label } from '@/types/database'

export default async function LabelsPage() {
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

  // Get all labels with usage count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: labels } = await (supabase as any)
    .from('labels')
    .select(`
      *,
      issue_labels(count)
    `)
    .order('name')

  const labelsWithCount = (labels || []).map((label: Label & { issue_labels: { count: number }[] }) => ({
    ...label,
    usage_count: label.issue_labels?.[0]?.count || 0,
  }))

  return (
    <div className="min-h-screen">
      <Header user={profile as User | null} needsAttentionCount={needsAttentionCount || 0} />
      
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Labels</h1>
          <p className="text-slate-400">
            Manage global labels used across all projects.
          </p>
        </div>

        <LabelsManager labels={labelsWithCount} />
      </main>
    </div>
  )
}
