'use client'

import { useState, useRef, useEffect } from 'react'
import type { Priority } from '@/types/database'

interface QuickAddCardProps {
  onAdd: (title: string, priority?: Priority) => void
}

// Parse priority prefix from title
// ! = low, !! = medium, !!! = high, !!!! = critical
function parsePriorityPrefix(input: string): { title: string; priority?: Priority } {
  const trimmed = input.trim()
  
  if (trimmed.startsWith('!!!!')) {
    return { title: trimmed.slice(4).trim(), priority: 'critical' }
  }
  if (trimmed.startsWith('!!!')) {
    return { title: trimmed.slice(3).trim(), priority: 'high' }
  }
  if (trimmed.startsWith('!!')) {
    return { title: trimmed.slice(2).trim(), priority: 'medium' }
  }
  if (trimmed.startsWith('!')) {
    return { title: trimmed.slice(1).trim(), priority: 'low' }
  }
  
  return { title: trimmed }
}

export function QuickAddCard({ onAdd }: QuickAddCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { title: parsedTitle, priority } = parsePriorityPrefix(title)
    if (parsedTitle) {
      onAdd(parsedTitle, priority)
      setTitle('')
      setIsAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setTitle('')
      setIsAdding(false)
    }
  }

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
        title="Quick add issue"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 ml-2">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) {
            setIsAdding(false)
          }
        }}
        placeholder="Title (prefix: ! !! !!! !!!!)"
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
      />
    </form>
  )
}
