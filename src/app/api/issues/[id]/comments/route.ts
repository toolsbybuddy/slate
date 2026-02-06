import { authenticateRequest, apiError, apiSuccess, getServiceClient } from '@/lib/api-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/issues/[id]/comments - List comments for an issue
export async function GET(request: Request, { params }: RouteParams) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  const { id } = await params
  const supabase = getServiceClient()

  // Verify issue exists
  const { data: issue, error: issueError } = await supabase
    .from('issues')
    .select('id')
    .eq('id', id)
    .single()

  if (issueError || !issue) {
    return apiError('Issue not found', 404)
  }

  // Get comments
  const { data: comments, error: queryError } = await supabase
    .from('comments')
    .select(`
      *,
      author:users(id, name, avatar_url, is_bot)
    `)
    .eq('issue_id', id)
    .order('created_at', { ascending: true })

  if (queryError) {
    return apiError(queryError.message, 500)
  }

  return apiSuccess(comments)
}

// POST /api/issues/[id]/comments - Add a comment to an issue
export async function POST(request: Request, { params }: RouteParams) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  const { id } = await params

  let body: { body?: string }
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  if (!body.body?.trim()) {
    return apiError('Comment body is required', 400)
  }

  const supabase = getServiceClient()

  // Verify issue exists and get project
  const { data: issue, error: issueError } = await supabase
    .from('issues')
    .select('id, project_id')
    .eq('id', id)
    .single()

  if (issueError || !issue) {
    return apiError('Issue not found', 404)
  }

  // Create comment
  const { data: comment, error: insertError } = await supabase
    .from('comments')
    .insert({
      issue_id: id,
      author_id: user.id,
      body: body.body.trim(),
    })
    .select(`
      *,
      author:users(id, name, avatar_url, is_bot)
    `)
    .single()

  if (insertError) {
    return apiError(insertError.message, 500)
  }

  // Add audit log entry
  await supabase
    .from('audit_log')
    .insert({
      project_id: issue.project_id,
      issue_id: id,
      actor_id: user.id,
      action: 'comment_added',
      details: { preview: body.body.trim().slice(0, 100) },
    })

  return apiSuccess(comment, 201)
}
