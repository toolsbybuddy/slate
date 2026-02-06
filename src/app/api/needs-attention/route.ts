import { authenticateRequest, apiError, apiSuccess, getServiceClient } from '@/lib/api-auth'

// GET /api/needs-attention - List all issues needing attention across projects
export async function GET(request: Request) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  const { searchParams } = new URL(request.url)
  const projectSlug = searchParams.get('project')
  const assignee = searchParams.get('assignee')

  const supabase = getServiceClient()

  let query = supabase
    .from('issues')
    .select(`
      *,
      project:projects!inner(id, name, slug, is_archived),
      assignee:users!issues_assignee_id_fkey(id, name, avatar_url, is_bot),
      labels:issue_labels(
        label:labels(*)
      )
    `)
    .eq('needs_attention', true)
    .eq('projects.is_archived', false)
    .order('updated_at', { ascending: false })

  if (projectSlug) {
    query = query.eq('projects.slug', projectSlug)
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

  const { data: issues, error: queryError } = await query

  if (queryError) {
    return apiError(queryError.message, 500)
  }

  // Transform issues
  const transformedIssues = issues?.map(issue => {
    const project = issue.project as { slug: string } | null
    const slug = project?.slug || ''
    return {
      ...issue,
      issue_id: `${slug.toUpperCase()}-${issue.number}`,
      labels: issue.labels?.map((il: { label: unknown }) => il.label) || [],
    }
  })

  return apiSuccess(transformedIssues)
}
