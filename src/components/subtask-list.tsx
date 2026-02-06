'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Subtask } from '@/types/database'

interface SubtaskListProps {
  issueId: string
  subtasks: Subtask[]
  onUpdate: () => void
}

export function SubtaskList({ issueId, subtasks, onUpdate }: SubtaskListProps) {
  const [newSubtask, setNewSubtask] = useState('')
  const [adding, setAdding] = useState(false)
  const supabase = createClient()

  const completedCount = subtasks.filter(s => s.is_done).length
  const totalCount = subtasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const addSubtask = async () => {
    if (!newSubtask.trim()) return
    setAdding(true)

    const maxPosition = subtasks.length > 0 
      ? Math.max(...subtasks.map(s => s.position)) 
      : -1

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('subtasks')
      .insert({
        issue_id: issueId,
        title: newSubtask.trim(),
        position: maxPosition + 1,
      })

    setNewSubtask('')
    setAdding(false)
    onUpdate()
  }

  const toggleSubtask = async (subtaskId: string, isDone: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('subtasks')
      .update({ is_done: !isDone })
      .eq('id', subtaskId)

    onUpdate()
  }

  const deleteSubtask = async (subtaskId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('subtasks')
      .delete()
      .eq('id', subtaskId)

    onUpdate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-400">
          Subtasks
          {totalCount > 0 && (
            <span className="ml-2 text-slate-500">
              ({completedCount}/{totalCount})
            </span>
          )}
        </h3>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1.5 bg-slate-800 rounded-full mb-4 overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Subtask list */}
      <div className="space-y-2 mb-4">
        {subtasks
          .sort((a, b) => a.position - b.position)
          .map(subtask => (
            <div 
              key={subtask.id}
              className="flex items-center gap-2 group"
            >
              <input
                type="checkbox"
                checked={subtask.is_done}
                onChange={() => toggleSubtask(subtask.id, subtask.is_done)}
                className="rounded border-slate-600 bg-slate-800 text-green-500 focus:ring-green-500"
              />
              <span className={`flex-1 text-sm ${subtask.is_done ? 'line-through text-slate-500' : ''}`}>
                {subtask.title}
              </span>
              <button
                onClick={() => deleteSubtask(subtask.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                title="Delete subtask"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
      </div>

      {/* Add new subtask */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          placeholder="Add a subtask..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
          onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
        />
        <button
          onClick={addSubtask}
          disabled={!newSubtask.trim() || adding}
          className="btn btn-ghost text-sm"
        >
          Add
        </button>
      </div>
    </div>
  )
}
