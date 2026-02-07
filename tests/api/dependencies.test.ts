import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { apiRequest, cleanupTestData } from '../utils'

describe('Dependencies API', () => {
  const testPrefix = `test-${Date.now()}`
  let projectSlug: string
  let issue1Id: string
  let issue2Id: string
  let issue3Id: string

  beforeAll(async () => {
    // Create a test project
    const projectResponse = await apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: `${testPrefix} Dependencies Test`,
        slug: `${testPrefix}-deps`,
      }),
    })
    const project = await projectResponse.json()
    projectSlug = project.slug

    // Create test issues
    const issue1Response = await apiRequest(`/api/projects/${projectSlug}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title: `${testPrefix} Issue 1` }),
    })
    issue1Id = (await issue1Response.json()).id

    const issue2Response = await apiRequest(`/api/projects/${projectSlug}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title: `${testPrefix} Issue 2` }),
    })
    issue2Id = (await issue2Response.json()).id

    const issue3Response = await apiRequest(`/api/projects/${projectSlug}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title: `${testPrefix} Issue 3` }),
    })
    issue3Id = (await issue3Response.json()).id
  })

  afterAll(async () => {
    await cleanupTestData(testPrefix)
  })

  describe('GET /api/issues/[id]/dependencies', () => {
    it('should return empty dependencies for new issue', async () => {
      const response = await apiRequest(`/api/issues/${issue1Id}/dependencies`)
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      
      expect(data.blockedBy).toEqual([])
      expect(data.blocking).toEqual([])
    })

    it('should return 404 for non-existent issue', async () => {
      const response = await apiRequest('/api/issues/00000000-0000-0000-0000-000000000000/dependencies')
      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/issues/[id]/dependencies', () => {
    it('should create a "blocks" dependency', async () => {
      // Issue 1 blocks Issue 2
      const response = await apiRequest(`/api/issues/${issue1Id}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({
          target_issue_id: issue2Id,
          type: 'blocks',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.dependency.blocker_id).toBe(issue1Id)
      expect(data.dependency.blocked_id).toBe(issue2Id)
    })

    it('should create a "blocked_by" dependency', async () => {
      // Issue 3 is blocked by Issue 1
      const response = await apiRequest(`/api/issues/${issue3Id}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({
          target_issue_id: issue1Id,
          type: 'blocked_by',
        }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.dependency.blocker_id).toBe(issue1Id)
      expect(data.dependency.blocked_id).toBe(issue3Id)
    })

    it('should show dependencies after creation', async () => {
      // Issue 1 should block issue 2 and issue 3
      const response = await apiRequest(`/api/issues/${issue1Id}/dependencies`)
      const data = await response.json()
      
      expect(data.blocking.length).toBe(2)
      expect(data.blocking.map((i: { id: string }) => i.id)).toContain(issue2Id)
      expect(data.blocking.map((i: { id: string }) => i.id)).toContain(issue3Id)
    })

    it('should reject duplicate dependency', async () => {
      const response = await apiRequest(`/api/issues/${issue1Id}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({
          target_issue_id: issue2Id,
          type: 'blocks',
        }),
      })

      expect(response.status).toBe(409)
    })

    it('should reject self-dependency', async () => {
      const response = await apiRequest(`/api/issues/${issue1Id}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({
          target_issue_id: issue1Id,
          type: 'blocks',
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('itself')
    })

    it('should reject circular dependency', async () => {
      // Issue 1 blocks Issue 2, so Issue 2 cannot block Issue 1
      const response = await apiRequest(`/api/issues/${issue2Id}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({
          target_issue_id: issue1Id,
          type: 'blocks',
        }),
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Circular')
    })

    it('should reject missing target_issue_id', async () => {
      const response = await apiRequest(`/api/issues/${issue1Id}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({ type: 'blocks' }),
      })

      expect(response.status).toBe(400)
    })

    it('should reject invalid type', async () => {
      const response = await apiRequest(`/api/issues/${issue1Id}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({
          target_issue_id: issue2Id,
          type: 'invalid',
        }),
      })

      expect(response.status).toBe(400)
    })

    it('should reject non-existent target issue', async () => {
      const response = await apiRequest(`/api/issues/${issue1Id}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({
          target_issue_id: '00000000-0000-0000-0000-000000000000',
          type: 'blocks',
        }),
      })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/issues/[id]/dependencies', () => {
    it('should remove a dependency', async () => {
      // Remove Issue 1 blocks Issue 2
      const response = await apiRequest(
        `/api/issues/${issue1Id}/dependencies?target_issue_id=${issue2Id}&type=blocks`,
        { method: 'DELETE' }
      )

      expect(response.ok).toBe(true)
      
      // Verify it's gone
      const getResponse = await apiRequest(`/api/issues/${issue1Id}/dependencies`)
      const data = await getResponse.json()
      expect(data.blocking.map((i: { id: string }) => i.id)).not.toContain(issue2Id)
    })

    it('should require target_issue_id', async () => {
      const response = await apiRequest(
        `/api/issues/${issue1Id}/dependencies?type=blocks`,
        { method: 'DELETE' }
      )

      expect(response.status).toBe(400)
    })

    it('should require valid type', async () => {
      const response = await apiRequest(
        `/api/issues/${issue1Id}/dependencies?target_issue_id=${issue2Id}&type=invalid`,
        { method: 'DELETE' }
      )

      expect(response.status).toBe(400)
    })
  })
})
