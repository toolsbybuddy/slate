import { authenticateRequest, apiError, apiSuccess, getServiceClient } from '@/lib/api-auth'
import type { IssueStatus, Priority } from '@/types/database'

interface RouteParams {
  params: Promise<{ slug: string }>
}

// GET /api/projects/[slug]/issues - List issues for a project
export async function GET(request: Request, { params }: RouteParams) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  const { slug } = await params
  const { searchParams } = new URL(request.url)
  
  const status = searchParams.get('status') as IssueStatus | null
  const assignee = searchParams.get('assignee')
  const needsAttention = searchParams.get('needs_attention') === 'true'

  const supabase = getServiceClient()

  // Get project first
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('slug', slug)
    .single()

  if (projectError || !project) {
    return apiError('Project not found', 404)
  }

  // Build query
  let query = supabase
    .from('issues')
    .select(`
      *,
      assignee:users!issues_assignee_id_fkey(id, name, avatar_url, is_bot),
      labels:issue_labels(
        label:labels(*)
      )
    `)
    .eq('project_id', project.id)
    .order('updated_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  if (assignee) {
    if (assignee === 'me') {
      query = query.eq('assignee_id', user.id)
    } else if (assignee === 'unassigned') {
      query = query.is('assignee_id', null)
    } else {
      query = query.eq('assignee_id', assignee)
    }
  }

  if (needsAttention) {
    query = query.eq('needs_attention', true)
  }

  const { data: issues, error: queryError } = await query

  if (queryError) {
    return apiError(queryError.message, 500)
  }

  // Transform to flatten labels
  const transformedIssues = issues?.map(issue => ({
    ...issue,
    issue_id: `${slug.toUpperCase()}-${issue.number}`,
    labels: issue.labels?.map((il: { label: unknown }) => il.label) || []
  }))

  return apiSuccess(transformedIssues)
}

// POST /api/projects/[slug]/issues - Create an issue
export async function POST(request: Request, { params }: RouteParams) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  const { slug } = await params

  let body: {
    title?: string
    description?: string
    status?: IssueStatus
    priority?: Priority
    needs_attention?: boolean
    assignee_id?: string | null
    due_date?: string | null
  }

  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const { title, description, status, priority, needs_attention, assignee_id, due_date } = body

  if (!title?.trim()) {
    return apiError('Title is required', 400)
  }

  const supabase = getServiceClient()

  // Get project (include default_assignee_id)
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, default_assignee_id')
    .eq('slug', slug)
    .single()

  if (projectError || !project) {
    return apiError('Project not found', 404)
  }

  // Use provided assignee_id, or fall back to project default
  const effectiveAssigneeId = assignee_id !== undefined ? assignee_id : project.default_assignee_id

  // Create issue
  const { data: issue, error: insertError } = await supabase
    .from('issues')
    .insert({
      project_id: project.id,
      title: title.trim(),
      description: description?.trim() || null,
      status: status || 'backlog',
      priority: priority || 'medium',
      needs_attention: needs_attention || false,
      assignee_id: effectiveAssigneeId || null,
      due_date: due_date || null,
      created_by: user.id,
    })
    .select(`
      *,
      assignee:users!issues_assignee_id_fkey(id, name, avatar_url, is_bot)
    `)
    .single()

  if (insertError) {
    return apiError(insertError.message, 500)
  }

  // Add audit log entry
  await supabase
    .from('audit_log')
    .insert({
      project_id: project.id,
      issue_id: issue.id,
      actor_id: user.id,
      action: 'issue_created',
      details: { title: issue.title },
    })

  return apiSuccess({
    ...issue,
    issue_id: `${slug.toUpperCase()}-${issue.number}`,
  }, 201)
}
