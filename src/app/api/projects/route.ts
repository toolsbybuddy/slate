import { authenticateRequest, apiError, apiSuccess, getServiceClient } from '@/lib/api-auth'

// GET /api/projects - List all projects
export async function GET(request: Request) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  const { searchParams } = new URL(request.url)
  const includeArchived = searchParams.get('archived') === 'true'

  const supabase = getServiceClient()
  
  let query = supabase
    .from('projects')
    .select(`
      *,
      issues:issues(count)
    `)
    .order('updated_at', { ascending: false })

  if (!includeArchived) {
    query = query.eq('is_archived', false)
  }

  const { data: projects, error: queryError } = await query

  if (queryError) {
    return apiError(queryError.message, 500)
  }

  return apiSuccess(projects)
}

// POST /api/projects - Create a project
export async function POST(request: Request) {
  const { user, error } = await authenticateRequest(request)
  if (error || !user) {
    return apiError(error || 'Unauthorized', 401)
  }

  let body: { name?: string; slug?: string; description?: string }
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const { name, slug, description } = body

  if (!name?.trim() || !slug?.trim()) {
    return apiError('Name and slug are required', 400)
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return apiError('Slug must contain only lowercase letters, numbers, and hyphens', 400)
  }

  const supabase = getServiceClient()

  const { data: project, error: insertError } = await supabase
    .from('projects')
    .insert({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      description: description?.trim() || null,
    })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return apiError('A project with this slug already exists', 409)
    }
    return apiError(insertError.message, 500)
  }

  return apiSuccess(project, 201)
}
