'use client'

import { useEffect } from 'react'

export default function ActivityError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Activity page error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 max-w-lg text-center">
        <h2 className="text-xl font-bold text-red-400 mb-4">Activity Page Error</h2>
        <p className="text-slate-300 mb-4">{error.message}</p>
        {error.digest && (
          <p className="text-xs text-slate-500 mb-4">Digest: {error.digest}</p>
        )}
        <pre className="text-left text-xs bg-slate-900 p-4 rounded overflow-auto max-h-48 mb-4">
          {error.stack}
        </pre>
        <button
          onClick={reset}
          className="btn-primary"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
