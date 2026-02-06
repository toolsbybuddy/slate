'use client'

import { useState, useRef, useEffect } from 'react'
import type { User } from '@/types/database'

interface AssigneeSelectProps {
  value: string | null
  users: User[]
  onChange: (userId: string | null) => void
}

export function AssigneeSelect({ value, users, onChange }: AssigneeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentUser = users.find(u => u.id === value)

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
        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors text-left"
      >
        {currentUser ? (
          <>
            {currentUser.avatar_url ? (
              <img 
                src={currentUser.avatar_url} 
                alt={currentUser.name}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-medium">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm">
              {currentUser.name}
              {currentUser.is_bot && ' 🤖'}
            </span>
          </>
        ) : (
          <span className="text-sm text-slate-500">Unassigned</span>
        )}
        <svg className="w-4 h-4 ml-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 py-1 max-h-60 overflow-y-auto">
          <button
            onClick={() => {
              onChange(null)
              setIsOpen(false)
            }}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-800 ${
              !value ? 'bg-slate-800' : ''
            }`}
          >
            <span className="text-slate-500">Unassigned</span>
          </button>
          
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => {
                onChange(user.id)
                setIsOpen(false)
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-800 flex items-center gap-2 ${
                user.id === value ? 'bg-slate-800' : ''
              }`}
            >
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.name}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span>
                {user.name}
                {user.is_bot && ' 🤖'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
