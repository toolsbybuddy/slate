'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'

interface ProfileSettingsProps {
  user: User
}

export function ProfileSettings({ user: initialUser }: ProfileSettingsProps) {
  const [user, setUser] = useState(initialUser)
  const [name, setName] = useState(user.name)
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '')
  const [avatarPreview, setAvatarPreview] = useState(user.avatar_url || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setError(null)
    setSaving(true)
    setSaved(false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: updateError } = await (supabase as any)
      .from('users')
      .update({
        name: name.trim(),
        avatar_url: avatarUrl || null,
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      setError(updateError.message)
    } else {
      setUser(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    }
    setSaving(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB')
      return
    }

    setUploadingAvatar(true)
    setError(null)

    try {
      // Create preview immediately
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        // If storage bucket doesn't exist, fall back to URL input
        console.error('Avatar upload failed:', uploadError)
        setError('Avatar upload not available. Please use a URL instead.')
        setAvatarPreview(user.avatar_url || '')
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)
        
        setAvatarUrl(urlData.publicUrl)
      }
    } catch (err) {
      setError('Failed to upload avatar')
      setAvatarPreview(user.avatar_url || '')
    }

    setUploadingAvatar(false)
  }

  const handleAvatarUrlChange = (url: string) => {
    setAvatarUrl(url)
    setAvatarPreview(url)
  }

  const hasChanges = name !== user.name || avatarUrl !== (user.avatar_url || '')

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-400 mb-4">Profile Picture</h3>
        
        <div className="flex items-start gap-6">
          {/* Avatar Preview */}
          <div className="flex-shrink-0">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={name}
                className="w-24 h-24 rounded-full object-cover border-2 border-slate-700"
                onError={() => setAvatarPreview('')}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-3xl font-bold border-2 border-slate-700">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Upload/URL Input */}
          <div className="flex-1 space-y-3">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="btn btn-ghost text-sm"
              >
                {uploadingAvatar ? 'Uploading...' : 'Upload Image'}
              </button>
            </div>
            
            <div className="text-sm text-slate-500">or use URL:</div>
            
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => handleAvatarUrlChange(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="input text-sm"
            />
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-400 mb-4">Display Name</h3>
        
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="input"
        />
        <p className="text-sm text-slate-500 mt-2">
          This is how you appear to others in Slate.
        </p>
      </div>

      {/* Email (read-only) */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-400 mb-4">Email</h3>
        <input
          type="email"
          value={user.email || ''}
          disabled
          className="input opacity-50 cursor-not-allowed"
        />
        <p className="text-sm text-slate-500 mt-2">
          Email is managed through your authentication provider.
        </p>
      </div>

      {/* Save */}
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
  )
}
