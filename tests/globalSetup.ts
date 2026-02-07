import { config } from 'dotenv'

// Global setup - runs once before all tests
export async function setup() {
  // Load env vars
  config({ path: '.env.test' })
  const supabaseUrl = process.env.TEST_SUPABASE_URL!
  const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY!
  const testUserEmail = process.env.TEST_USER_EMAIL!

  // Get test user ID
  const userResponse = await fetch(
    `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(testUserEmail)}&select=id`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }
  )
  const users = await userResponse.json()
  if (!users.length) {
    throw new Error(`Test user not found: ${testUserEmail}`)
  }

  const userId = users[0].id
  const tokenValue = `slpat_global_${Date.now()}_${Math.random().toString(36).slice(2)}`

  // Create PAT
  const createResponse = await fetch(
    `${supabaseUrl}/rest/v1/personal_access_tokens`,
    {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        name: `global-test-token-${Date.now()}`,
        token_hash: tokenValue,
      }),
    }
  )

  if (!createResponse.ok) {
    throw new Error(`Failed to create PAT: ${await createResponse.text()}`)
  }

  // Store in env for tests to access
  process.env.TEST_PAT = tokenValue
  console.log('[Setup] Created global test PAT')
}

// Global teardown - runs once after all tests
export async function teardown() {
  // Load env vars (global setup/teardown run in separate processes)
  config({ path: '.env.test' })
  const supabaseUrl = process.env.TEST_SUPABASE_URL!
  const serviceKey = process.env.TEST_SUPABASE_SERVICE_KEY!

  // Delete all global test tokens
  await fetch(
    `${supabaseUrl}/rest/v1/personal_access_tokens?name=like.global-test-token-*`,
    {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }
  )
  console.log('[Teardown] Cleaned up global test PATs')
}
