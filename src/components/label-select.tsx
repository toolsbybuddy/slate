'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Label } from '@/types/database'

interface LabelSelectProps {
  issueId: string
  selectedLabels: Label[]
  allLabels: Label[]
  onUpdate: () => void
}

export function LabelSelect({ issueId, selectedLabels, allLabels, onUpdate }: LabelSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const selectedIds = new Set(selectedLabels.map(l => l.id))

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleLabel = async (labelId: string) => {
    if (selectedIds.has(labelId)) {
      // Remove label
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('issue_labels')
        .delete()
        .eq('issue_id', issueId)
        .eq('label_id', labelId)
    } else {
      // Add label
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('issue_labels')
        .insert({ issue_id: issueId, label_id: labelId })
    }
    onUpdate()
  }

  const createLabel = async () => {
    if (!newLabelName.trim()) return
    setCreating(true)

    // Generate a random color
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
    const color = colors[Math.floor(Math.random() * colors.length)]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newLabel } = await (supabase as any)
      .from('labels')
      .insert({ name: newLabelName.trim(), color })
      .select()
      .single()

    if (newLabel) {
      // Also add it to this issue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('issue_labels')
        .insert({ issue_id: issueId, label_id: newLabel.id })
    }

    setNewLabelName('')
    setCreating(false)
    onUpdate()
  }

  return (
    <div ref={ref} className="relative">
      {/* Selected labels */}
      <div className="flex flex-wrap gap-1 mb-2">
        {selectedLabels.length > 0 ? (
          selectedLabels.map(label => (
            <span
              key={label.id}
              className="label-chip cursor-pointer hover:opacity-80"
              style={{ 
                backgroundColor: `${label.color}20`,
                color: label.color 
              }}
              onClick={() => toggleLabel(label.id)}
              title="Click to remove"
            >
              {label.name}
              <span className="ml-1">×</span>
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">No labels</span>
        )}
      </div>

      {/* Add label button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-indigo-400 hover:text-indigo-300"
      >
        + Add label
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 py-1 max-h-60 overflow-y-auto">
          {/* Create new label */}
          <div className="px-3 py-2 border-b border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="New label..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && createLabel()}
              />
              <button
                onClick={createLabel}
                disabled={!newLabelName.trim() || creating}
                className="btn btn-primary text-xs px-2 py-1"
              >
                Add
              </button>
            </div>
          </div>

          {/* Existing labels */}
          {allLabels.map(label => (
            <button
              key={label.id}
              onClick={() => toggleLabel(label.id)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-800 flex items-center gap-2 ${
                selectedIds.has(label.id) ? 'bg-slate-800' : ''
              }`}
            >
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: label.color }}
              />
              <span>{label.name}</span>
              {selectedIds.has(label.id) && (
                <svg className="w-4 h-4 ml-auto text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}

          {allLabels.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">
              No labels yet. Create one above.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
