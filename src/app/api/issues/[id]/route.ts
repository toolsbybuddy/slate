import { authenticateRequest, apiError, apiSuccess, getServiceClient } from '@/lib/api-auth'
import type { IssueStatus, Priority } from '@/types/database'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/issues/[id] - Get a single issue
export async function GET(request: Request, { params }: RouteParams) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  const { id } = await params
  const supabase = getServiceClient()

  const { data: issue, error: queryError } = await supabase
    .from('issues')
    .select(`
      *,
      project:projects(id, name, slug),
      assignee:users!issues_assignee_id_fkey(*),
      created_by_user:users!issues_created_by_fkey(*),
      labels:issue_labels(
        label:labels(*)
      ),
      subtasks(*),
      comments(
        *,
        author:users(*)
      )
    `)
    .eq('id', id)
    .single()

  if (queryError) {
    if (queryError.code === 'PGRST116') {
      return apiError('Issue not found', 404)
    }
    return apiError(queryError.message, 500)
  }

  // Get dependencies
  const { data: blockedBy } = await supabase
    .from('dependencies')
    .select(`
      blocker:issues!dependencies_blocker_id_fkey(
        id, number, title, status,
        project:projects(slug)
      )
    `)
    .eq('blocked_id', id)

  const { data: blocking } = await supabase
    .from('dependencies')
    .select(`
      blocked:issues!dependencies_blocked_id_fkey(
        id, number, title, status,
        project:projects(slug)
      )
    `)
    .eq('blocker_id', id)

  const slug = issue.project?.slug || ''
  
  return apiSuccess({
    ...issue,
    issue_id: `${slug.toUpperCase()}-${issue.number}`,
    labels: issue.labels?.map((il: { label: unknown }) => il.label) || [],
    blockedBy: blockedBy?.map((d: { blocker: unknown }) => d.blocker) || [],
    blocking: blocking?.map((d: { blocked: unknown }) => d.blocked) || [],
  })
}

// PATCH /api/issues/[id] - Update an issue
export async function PATCH(request: Request, { params }: RouteParams) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  const { id } = await params

  let body: {
    title?: string
    description?: string
    status?: IssueStatus
    priority?: Priority
    needs_attention?: boolean
    assignee_id?: string | null
    due_date?: string | null
    comment?: string  // Required when status changes to blocked
  }

  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const supabase = getServiceClient()

  // Get current issue state
  const { data: currentIssue, error: getError } = await supabase
    .from('issues')
    .select('*, project:projects(id, slug)')
    .eq('id', id)
    .single()

  if (getError || !currentIssue) {
    return apiError('Issue not found', 404)
  }

  // If changing to blocked status, require a comment
  if (body.status === 'blocked' && currentIssue.status !== 'blocked' && !body.comment?.trim()) {
    return apiError('A comment is required when setting status to Blocked', 400)
  }

  // Build update object
  const updates: Record<string, unknown> = {}
  const auditDetails: Record<string, unknown> = {}

  if (body.title !== undefined && body.title !== currentIssue.title) {
    updates.title = body.title.trim()
    auditDetails.title = { from: currentIssue.title, to: updates.title }
  }

  if (body.description !== undefined && body.description !== currentIssue.description) {
    updates.description = body.description?.trim() || null
    auditDetails.description = { changed: true }
  }

  if (body.status !== undefined && body.status !== currentIssue.status) {
    updates.status = body.status
    auditDetails.status = { from: currentIssue.status, to: body.status }
  }

  if (body.priority !== undefined && body.priority !== currentIssue.priority) {
    updates.priority = body.priority
    auditDetails.priority = { from: currentIssue.priority, to: body.priority }
  }

  if (body.needs_attention !== undefined && body.needs_attention !== currentIssue.needs_attention) {
    updates.needs_attention = body.needs_attention
    auditDetails.needs_attention = body.needs_attention
  }

  if (body.assignee_id !== undefined && body.assignee_id !== currentIssue.assignee_id) {
    updates.assignee_id = body.assignee_id
    auditDetails.assignee_id = { from: currentIssue.assignee_id, to: body.assignee_id }
  }

  if (body.due_date !== undefined && body.due_date !== currentIssue.due_date) {
    updates.due_date = body.due_date
    auditDetails.due_date = { from: currentIssue.due_date, to: body.due_date }
  }

  // Nothing to update
  if (Object.keys(updates).length === 0 && !body.comment) {
    return apiSuccess(currentIssue)
  }

  // Update issue if there are changes
  let updatedIssue = currentIssue
  if (Object.keys(updates).length > 0) {
    const { data, error: updateError } = await supabase
      .from('issues')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        assignee:users!issues_assignee_id_fkey(id, name, avatar_url, is_bot)
      `)
      .single()

    if (updateError) {
      return apiError(updateError.message, 500)
    }

    updatedIssue = data

    // Add audit log entry
    await supabase
      .from('audit_log')
      .insert({
        project_id: currentIssue.project.id,
        issue_id: id,
        actor_id: user.id,
        action: 'issue_updated',
        details: auditDetails,
      })
  }

  // Add comment if provided (especially for blocked status)
  if (body.comment?.trim()) {
    await supabase
      .from('comments')
      .insert({
        issue_id: id,
        author_id: user.id,
        body: body.comment.trim(),
      })

    // Add audit log for comment
    await supabase
      .from('audit_log')
      .insert({
        project_id: currentIssue.project.id,
        issue_id: id,
        actor_id: user.id,
        action: 'comment_added',
        details: { blocked_reason: body.status === 'blocked' },
      })
  }

  const slug = currentIssue.project?.slug || ''

  return apiSuccess({
    ...updatedIssue,
    issue_id: `${slug.toUpperCase()}-${updatedIssue.number}`,
  })
}

// DELETE /api/issues/[id] - Delete an issue
export async function DELETE(request: Request, { params }: RouteParams) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  const { id } = await params
  const supabase = getServiceClient()

  // Get issue for audit log
  const { data: issue, error: getError } = await supabase
    .from('issues')
    .select('*, project:projects(id)')
    .eq('id', id)
    .single()

  if (getError || !issue) {
    return apiError('Issue not found', 404)
  }

  // Delete issue (cascades to subtasks, comments, etc.)
  const { error: deleteError } = await supabase
    .from('issues')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return apiError(deleteError.message, 500)
  }

  // Add audit log entry
  await supabase
    .from('audit_log')
    .insert({
      project_id: issue.project.id,
      issue_id: null, // Issue is deleted
      actor_id: user.id,
      action: 'issue_deleted',
      details: { title: issue.title, number: issue.number },
    })

  return apiSuccess({ deleted: true })
}
