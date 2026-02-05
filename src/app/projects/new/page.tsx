'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
}

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugManuallyEdited) {
      setSlug(slugify(value))
    }
  }

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true)
    setSlug(slugify(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from('projects')
        .insert({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
        })

      if (insertError) {
        if (insertError.code === '23505') {
          setError('A project with this slug already exists')
        } else {
          setError(insertError.message)
        }
        setLoading(false)
        return
      }

      router.push(`/${slug}`)
    } catch (err) {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  const isValid = name.trim().length > 0 && slug.trim().length > 0

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-white">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">New Project</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Project Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Project"
              className="input"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium mb-2">
              Slug
              <span className="text-slate-400 font-normal ml-2">
                (used in URLs and issue IDs like {slug || 'PROJ'}-123)
              </span>
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="my-project"
              className="input font-mono"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description
              <span className="text-slate-400 font-normal ml-2">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className="input resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Link href="/" className="btn btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!isValid || loading}
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
