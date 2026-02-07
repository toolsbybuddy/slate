'use client'

import { useState, useRef, useEffect } from 'react'
import type { Resolution } from '@/types/database'

const RESOLUTIONS: { value: Resolution; label: string; icon: string }[] = [
  { value: 'completed', label: 'Completed', icon: '✅' },
  { value: 'wont_do', label: "Won't Do", icon: '🚫' },
  { value: 'duplicate', label: 'Duplicate', icon: '📋' },
  { value: 'invalid', label: 'Invalid', icon: '❌' },
]

interface ResolutionSelectProps {
  value: Resolution | null
  onChange: (resolution: Resolution | null) => void
}

export function ResolutionSelect({ value, onChange }: ResolutionSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = value ? RESOLUTIONS.find(r => r.value === value) : null

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
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded hover:border-slate-600 transition-colors"
      >
        {current ? (
          <>
            <span>{current.icon}</span>
            <span>{current.label}</span>
          </>
        ) : (
          <span className="text-slate-500">Set resolution...</span>
        )}
        <svg className="w-3 h-3 ml-1 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 py-1 min-w-[160px]">
          {value && (
            <button
              onClick={() => {
                onChange(null)
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-800 flex items-center gap-2"
            >
              Clear resolution
            </button>
          )}
          {RESOLUTIONS.map(resolution => (
            <button
              key={resolution.value}
              onClick={() => {
                onChange(resolution.value)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-800 flex items-center gap-2 ${
                resolution.value === value ? 'bg-slate-800' : ''
              }`}
            >
              <span>{resolution.icon}</span>
              {resolution.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
