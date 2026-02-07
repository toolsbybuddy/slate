import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env.test' })

// Ensure required env vars are set
const required = [
  'TEST_SUPABASE_URL',
  'TEST_SUPABASE_ANON_KEY',
  'TEST_SUPABASE_SERVICE_KEY',
  'TEST_USER_EMAIL',
  'TEST_USER_PASSWORD',
]

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`)
  }
}
