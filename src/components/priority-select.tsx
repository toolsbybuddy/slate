'use client'

import { useState, useRef, useEffect } from 'react'
import type { Priority } from '@/types/database'

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'var(--priority-low)' },
  { value: 'medium', label: 'Medium', color: 'var(--priority-medium)' },
  { value: 'high', label: 'High', color: 'var(--priority-high)' },
]

interface PrioritySelectProps {
  value: Priority
  onChange: (priority: Priority) => void
}

export function PrioritySelect({ value, onChange }: PrioritySelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = PRIORITIES.find(p => p.value === value)!

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
        className={`priority-badge cursor-pointer hover:opacity-80 transition-opacity text-sm px-3 py-1`}
        style={{ 
          backgroundColor: `${current.color}20`,
          color: current.color 
        }}
      >
        {current.label}
        <svg className="w-3 h-3 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 py-1 min-w-[120px]">
          {PRIORITIES.map(priority => (
            <button
              key={priority.value}
              onClick={() => {
                onChange(priority.value)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-800 flex items-center gap-2 ${
                priority.value === value ? 'bg-slate-800' : ''
              }`}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: priority.color }}
              />
              {priority.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
