'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { User, Comment } from '@/types/database'

interface CommentWithAuthor extends Comment {
  author: User
}

interface CommentThreadProps {
  issueId: string
  comments: CommentWithAuthor[]
  currentUser: User
  users: User[]
  onUpdate: () => void
}

export function CommentThread({ issueId, comments, currentUser, users, onUpdate }: CommentThreadProps) {
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const supabase = createClient()

  const postComment = async () => {
    if (!newComment.trim()) return
    setPosting(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('comments')
      .insert({
        issue_id: issueId,
        author_id: currentUser.id,
        body: newComment.trim(),
      })

    setNewComment('')
    setPosting(false)
    onUpdate()
  }

  const startEdit = (comment: CommentWithAuthor) => {
    setEditingId(comment.id)
    setEditText(comment.body)
  }

  const saveEdit = async () => {
    if (!editText.trim() || !editingId) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('comments')
      .update({ body: editText.trim() })
      .eq('id', editingId)

    setEditingId(null)
    setEditText('')
    onUpdate()
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('comments')
      .delete()
      .eq('id', commentId)

    onUpdate()
  }

  // Simple @mention parsing
  const renderCommentBody = (body: string) => {
    const parts = body.split(/(@\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const username = part.slice(1).toLowerCase()
        const mentionedUser = users.find(u => 
          u.name.toLowerCase().replace(/\s+/g, '') === username ||
          u.name.toLowerCase() === username
        )
        if (mentionedUser) {
          return (
            <span key={i} className="text-indigo-400 font-medium">
              {part}
            </span>
          )
        }
      }
      return part
    })
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-400 mb-4">
        Comments
        {comments.length > 0 && (
          <span className="ml-2 text-slate-500">({comments.length})</span>
        )}
      </h3>

      {/* Comment list */}
      <div className="space-y-4 mb-6">
        {comments.map(comment => (
          <div key={comment.id} className="flex gap-3">
            {comment.author.avatar_url ? (
              <img 
                src={comment.author.avatar_url} 
                alt={comment.author.name}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                {comment.author.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">
                  {comment.author.name}
                  {comment.author.is_bot && ' 🤖'}
                </span>
                <span className="text-xs text-slate-500">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.updated_at !== comment.created_at && (
                  <span className="text-xs text-slate-600">(edited)</span>
                )}
              </div>

              {editingId === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="input resize-none text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="btn btn-primary text-xs">
                      Save
                    </button>
                    <button 
                      onClick={() => setEditingId(null)} 
                      className="btn btn-ghost text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">
                    {renderCommentBody(comment.body)}
                  </p>

                  {comment.author_id === currentUser.id && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => startEdit(comment)}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="text-xs text-slate-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <p className="text-sm text-slate-500 italic">No comments yet.</p>
        )}
      </div>

      {/* New comment form */}
      <div className="flex gap-3">
        {currentUser.avatar_url ? (
          <img 
            src={currentUser.avatar_url} 
            alt={currentUser.name}
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment... Use @name to mention someone"
            rows={3}
            className="input resize-none text-sm mb-2"
          />
          <div className="flex justify-end">
            <button
              onClick={postComment}
              disabled={!newComment.trim() || posting}
              className="btn btn-primary text-sm"
            >
              {posting ? 'Posting...' : 'Comment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
