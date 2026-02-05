'use client'

import { useState, useRef, useEffect } from 'react'

interface QuickAddCardProps {
  onAdd: (title: string) => void
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
    if (title.trim()) {
      onAdd(title.trim())
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
        placeholder="Issue title..."
        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-indigo-500"
      />
    </form>
  )
}
