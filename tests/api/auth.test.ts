import { describe, it, expect } from 'vitest'
import { TEST_CONFIG, apiRequest, getTestPAT, getSupabaseAuthTokens } from '../utils'

describe('Authentication', () => {

  describe('Supabase Auth', () => {
    it('should authenticate with valid credentials', async () => {
      const tokens = await getSupabaseAuthTokens()
      
      expect(tokens.accessToken).toBeDefined()
      expect(tokens.accessToken.length).toBeGreaterThan(0)
      expect(tokens.refreshToken).toBeDefined()
      expect(tokens.user.email).toBe(TEST_CONFIG.testUserEmail)
    })

    it('should reject invalid credentials', async () => {
      const response = await fetch(
        `${TEST_CONFIG.supabaseUrl}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: {
            'apikey': TEST_CONFIG.supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'invalid@example.com',
            password: 'wrongpassword',
          }),
        }
      )

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })

  describe('Personal Access Token Auth', () => {
    it('should use the global test PAT', () => {
      const pat = getTestPAT()
      
      expect(pat).toBeDefined()
      expect(pat.startsWith('slpat_global_')).toBe(true)
      
      // Should return same token on second call
      const pat2 = getTestPAT()
      expect(pat2).toBe(pat)
    })

    it('should allow authenticated requests with PAT', async () => {
      const response = await apiRequest('/api/projects')
      
      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should reject unauthenticated requests', async () => {
      const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/projects`)
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })

    it('should reject invalid PAT tokens', async () => {
      const response = await fetch(`${TEST_CONFIG.apiBaseUrl}/api/projects`, {
        headers: {
          'Authorization': 'Bearer invalid_token_xyz',
        },
      })
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })

  describe('Token Management API', () => {
    it('should list tokens for authenticated user', async () => {
      const response = await apiRequest('/api/tokens')
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should create a new token via API', async () => {
      const response = await apiRequest('/api/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: 'API Created Token' }),
      })
      
      expect(response.ok).toBe(true)
      const { token, id } = await response.json()
      
      expect(token).toBeDefined()
      expect(token.startsWith('slat_')).toBe(true)
      expect(id).toBeDefined()

      // Clean up
      await apiRequest(`/api/tokens?id=${id}`, { method: 'DELETE' })
    })
  })
})
