'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types/database'

interface ProjectSettingsProps {
  project: Project
}

export function ProjectSettings({ project: initialProject }: ProjectSettingsProps) {
  const [project, setProject] = useState(initialProject)
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    setSaved(false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: updateError } = await (supabase as any)
      .from('projects')
      .update({
        name: name.trim(),
        description: description.trim() || null,
      })
      .eq('id', project.id)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
    } else {
      setProject(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const handleArchive = async () => {
    const action = project.is_archived ? 'unarchive' : 'archive'
    if (!confirm(`Are you sure you want to ${action} this project?`)) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('projects')
      .update({ is_archived: !project.is_archived })
      .eq('id', project.id)

    if (!updateError) {
      if (!project.is_archived) {
        // Archiving - redirect to home
        router.push('/')
      } else {
        // Unarchiving - refresh
        router.refresh()
        setProject({ ...project, is_archived: false })
      }
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      return
    }
    if (!confirm('Really delete? All issues and comments will be permanently lost.')) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('projects')
      .delete()
      .eq('id', project.id)

    if (!deleteError) {
      router.push('/')
    } else {
      setError(deleteError.message)
    }
  }

  const hasChanges = name !== project.name || description !== (project.description || '')

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-400">Basic Information</h3>
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Project Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium mb-1">
            Slug
            <span className="text-slate-500 font-normal ml-2">(cannot be changed)</span>
          </label>
          <input
            id="slug"
            type="text"
            value={project.slug}
            disabled
            className="input opacity-50 cursor-not-allowed font-mono"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="What is this project about?"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving || !name.trim()}
            className="btn btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && (
            <span className="text-green-400 text-sm">✓ Saved</span>
          )}
        </div>
      </div>

      {/* Archive */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Archive Project</h3>
        <p className="text-sm text-slate-400 mb-4">
          {project.is_archived 
            ? 'This project is archived. It is read-only and hidden from the main project list.'
            : 'Archiving a project makes it read-only and hides it from the main project list. You can unarchive it later.'}
        </p>
        <button
          onClick={handleArchive}
          className={`btn ${project.is_archived ? 'btn-primary' : 'btn-ghost border border-amber-500/50 text-amber-500 hover:bg-amber-500/10'}`}
        >
          {project.is_archived ? 'Unarchive Project' : 'Archive Project'}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="card p-6 border-red-500/30">
        <h3 className="text-sm font-semibold text-red-400 mb-3">Danger Zone</h3>
        <p className="text-sm text-slate-400 mb-4">
          Deleting a project permanently removes all issues, comments, and activity. This cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          className="btn btn-ghost border border-red-500/50 text-red-500 hover:bg-red-500/10"
        >
          Delete Project
        </button>
      </div>
    </div>
  )
}
