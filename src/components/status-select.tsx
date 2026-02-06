'use client'

import { useState, useRef, useEffect } from 'react'
import type { IssueStatus } from '@/types/database'

const STATUSES: { value: IssueStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'var(--status-backlog)' },
  { value: 'ready', label: 'Ready', color: 'var(--status-ready)' },
  { value: 'in_progress', label: 'In Progress', color: 'var(--status-in-progress)' },
  { value: 'blocked', label: 'Blocked', color: 'var(--status-blocked)' },
  { value: 'done', label: 'Done', color: 'var(--status-done)' },
]

interface StatusSelectProps {
  value: IssueStatus
  onChange: (status: IssueStatus) => void
}

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = STATUSES.find(s => s.value === value)!

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`status-badge cursor-pointer hover:opacity-80 transition-opacity`}
        style={{ 
          backgroundColor: `${current.color}20`,
          color: current.color 
        }}
      >
        {current.label}
        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 py-1 min-w-[140px]">
          {STATUSES.map(status => (
            <button
              key={status.value}
              onClick={() => {
                onChange(status.value)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-800 flex items-center gap-2 ${
                status.value === value ? 'bg-slate-800' : ''
              }`}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: status.color }}
              />
              {status.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
