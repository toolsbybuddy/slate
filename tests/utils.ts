// Test utilities for API testing

export const TEST_CONFIG = {
  supabaseUrl: process.env.TEST_SUPABASE_URL!,
  supabaseAnonKey: process.env.TEST_SUPABASE_ANON_KEY!,
  supabaseServiceKey: process.env.TEST_SUPABASE_SERVICE_KEY!,
  testUserEmail: process.env.TEST_USER_EMAIL!,
  testUserPassword: process.env.TEST_USER_PASSWORD!,
  // API base URL - use deployed test environment
  apiBaseUrl: process.env.TEST_API_URL || 'https://test.clearslate.dev',
}

/**
 * Get the global test PAT (created in setup.ts)
 */
export function getTestPAT(): string {
  const pat = process.env.TEST_PAT
  if (!pat) {
    throw new Error('TEST_PAT not set - ensure tests run with setup.ts')
  }
  return pat
}

/**
 * Make an authenticated API request using PAT
 */
export async function apiRequest(
  path: string,
  options: RequestInit = {},
  patToken?: string
): Promise<Response> {
  const token = patToken || await getTestPAT()
  
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('Content-Type', 'application/json')

  return fetch(`${TEST_CONFIG.apiBaseUrl}${path}`, {
    ...options,
    headers,
  })
}

/**
 * Make a service-role API request (bypasses RLS)
 */
export async function serviceRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${TEST_CONFIG.supabaseServiceKey}`)
  headers.set('apikey', TEST_CONFIG.supabaseServiceKey)
  headers.set('Content-Type', 'application/json')

  return fetch(`${TEST_CONFIG.supabaseUrl}/rest/v1${path}`, {
    ...options,
    headers,
  })
}

/**
 * Generate a unique test identifier
 */
export function testId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Clean up test data by prefix
 */
export async function cleanupTestData(prefix: string): Promise<void> {
  // Delete test projects (cascades to issues, etc.)
  await serviceRequest(
    `/projects?slug=like.${prefix}*`,
    { method: 'DELETE' }
  )
  
  // Delete test labels
  await serviceRequest(
    `/labels?name=like.${prefix}*`,
    { method: 'DELETE' }
  )
}

/**
 * Sign in with test user and get Supabase auth tokens (for auth-specific tests)
 */
export async function getSupabaseAuthTokens() {
  const response = await fetch(
    `${TEST_CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'apikey': TEST_CONFIG.supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_CONFIG.testUserEmail,
        password: TEST_CONFIG.testUserPassword,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get auth tokens: ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user,
  }
}
