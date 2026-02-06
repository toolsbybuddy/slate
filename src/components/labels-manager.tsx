'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Label } from '@/types/database'

interface LabelWithCount extends Label {
  usage_count: number
}

interface LabelsManagerProps {
  labels: LabelWithCount[]
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6b7280', // gray
]

export function LabelsManager({ labels: initialLabels }: LabelsManagerProps) {
  const [labels, setLabels] = useState(initialLabels)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [creating, setCreating] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const createLabel = async () => {
    if (!newLabelName.trim()) return
    setCreating(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('labels')
      .insert({
        name: newLabelName.trim(),
        color: newLabelColor,
      })
      .select()
      .single()

    if (!error && data) {
      setLabels([...labels, { ...data, usage_count: 0 }])
      setNewLabelName('')
      setNewLabelColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
    }
    setCreating(false)
  }

  const startEdit = (label: LabelWithCount) => {
    setEditingId(label.id)
    setEditName(label.name)
    setEditColor(label.color)
  }

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('labels')
      .update({
        name: editName.trim(),
        color: editColor,
      })
      .eq('id', editingId)

    if (!error) {
      setLabels(labels.map(l => 
        l.id === editingId 
          ? { ...l, name: editName.trim(), color: editColor }
          : l
      ))
    }
    setEditingId(null)
  }

  const deleteLabel = async (labelId: string, usageCount: number) => {
    if (usageCount > 0) {
      if (!confirm(`This label is used by ${usageCount} issue(s). Delete anyway?`)) {
        return
      }
    } else {
      if (!confirm('Delete this label?')) {
        return
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('labels')
      .delete()
      .eq('id', labelId)

    if (!error) {
      setLabels(labels.filter(l => l.id !== labelId))
    }
  }

  return (
    <div className="space-y-6">
      {/* Create new label */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Create Label</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Label name..."
            className="input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && createLabel()}
          />
          <div className="flex items-center gap-1">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setNewLabelColor(color)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  newLabelColor === color ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <button
            onClick={createLabel}
            disabled={!newLabelName.trim() || creating}
            className="btn btn-primary"
          >
            Create
          </button>
        </div>
        
        {/* Preview */}
        {newLabelName.trim() && (
          <div className="mt-3">
            <span className="text-xs text-slate-500 mr-2">Preview:</span>
            <span
              className="label-chip"
              style={{ 
                backgroundColor: `${newLabelColor}20`,
                color: newLabelColor 
              }}
            >
              {newLabelName.trim()}
            </span>
          </div>
        )}
      </div>

      {/* Labels list */}
      <div className="card">
        {labels.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No labels yet. Create one above.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {labels.map(label => (
              <div key={label.id} className="p-4 flex items-center gap-4">
                {editingId === label.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="input flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <div className="flex items-center gap-1">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => setEditColor(color)}
                          className={`w-5 h-5 rounded-full transition-transform ${
                            editColor === color ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <button onClick={saveEdit} className="btn btn-primary text-sm">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="btn btn-ghost text-sm">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      className="label-chip"
                      style={{ 
                        backgroundColor: `${label.color}20`,
                        color: label.color 
                      }}
                    >
                      {label.name}
                    </span>
                    <span className="text-sm text-slate-500 flex-1">
                      {label.usage_count} issue{label.usage_count !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => startEdit(label)}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteLabel(label.id, label.usage_count)}
                      className="text-slate-400 hover:text-red-400 text-sm"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
