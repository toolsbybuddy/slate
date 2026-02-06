import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { User } from '@/types/database'

// Create a Supabase client with service role for API operations
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface AuthResult {
  user: User | null
  error: string | null
}

/**
 * Authenticate an API request.
 * Supports:
 * 1. Supabase session (cookie-based, for web UI)
 * 2. Personal Access Token (Bearer token, for bots)
 */
export async function authenticateRequest(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization')

  // Check for Bearer token (PAT)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    return authenticateWithPAT(token)
  }

  // Fall back to session auth
  return authenticateWithSession()
}

async function authenticateWithSession(): Promise<AuthResult> {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return { user: null, error: 'Not authenticated' }
    }

    // Get app user profile
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authUser.id)
      .single()

    if (error || !user) {
      return { user: null, error: 'User profile not found' }
    }

    return { user: user as User, error: null }
  } catch {
    return { user: null, error: 'Authentication failed' }
  }
}

async function authenticateWithPAT(token: string): Promise<AuthResult> {
  try {
    const supabase = createServiceClient()

    // Simple token lookup - in production, you'd hash the token
    // For now, we store tokens as-is (not secure for production!)
    // TODO: Implement proper token hashing with bcrypt
    const { data: pat, error: patError } = await supabase
      .from('personal_access_tokens')
      .select('*, user:users(*)')
      .eq('token_hash', token)
      .single()

    if (patError || !pat) {
      return { user: null, error: 'Invalid token' }
    }

    // Update last used timestamp
    await supabase
      .from('personal_access_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', pat.id)

    return { user: pat.user as User, error: null }
  } catch {
    return { user: null, error: 'Token authentication failed' }
  }
}

/**
 * Helper to create JSON error response
 */
export function apiError(message: string, status: number = 400) {
  return Response.json({ error: message }, { status })
}

/**
 * Helper to create JSON success response
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return Response.json(data, { status })
}

/**
 * Get service role client for API operations
 */
export function getServiceClient() {
  return createServiceClient()
}
