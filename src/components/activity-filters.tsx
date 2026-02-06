'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@/types/database'

interface ActivityFiltersProps {
  users: User[]
  actionTypes: string[]
  projectSlug: string
}

export function ActivityFilters({ users, actionTypes, projectSlug }: ActivityFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentActor = searchParams.get('actor') || 'all'
  const currentType = searchParams.get('type') || 'all'

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const queryString = params.toString()
    router.push(`/${projectSlug}/activity${queryString ? `?${queryString}` : ''}`)
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-400">Actor:</label>
        <select
          value={currentActor}
          onChange={(e) => updateFilter('actor', e.target.value)}
          className="input py-1 px-2 w-36 text-sm"
        >
          <option value="all">All</option>
          {users?.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} {u.is_bot ? '🤖' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-400">Type:</label>
        <select
          value={currentType}
          onChange={(e) => updateFilter('type', e.target.value)}
          className="input py-1 px-2 w-40 text-sm"
        >
          <option value="all">All types</option>
          {actionTypes.map(action => (
            <option key={action} value={action}>
              {action.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
