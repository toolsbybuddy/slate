import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { apiRequest, cleanupTestData } from '../utils'

describe('Needs Attention API', () => {
  const testPrefix = `test-${Date.now()}`
  let projectSlug: string
  let flaggedIssueId: string

  beforeAll(async () => {
    // Create a test project
    const projectResponse = await apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: `${testPrefix} Attention Test`,
        slug: `${testPrefix}-attention`,
      }),
    })
    const project = await projectResponse.json()
    projectSlug = project.slug

    // Create an issue with needs_attention flag
    const issueResponse = await apiRequest(`/api/projects/${projectSlug}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title: `${testPrefix} Flagged Issue`,
        needs_attention: true,
      }),
    })
    const issue = await issueResponse.json()
    flaggedIssueId = issue.id

    // Create another issue without the flag
    await apiRequest(`/api/projects/${projectSlug}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title: `${testPrefix} Normal Issue`,
        needs_attention: false,
      }),
    })
  })

  afterAll(async () => {
    await cleanupTestData(testPrefix)
  })

  describe('GET /api/needs-attention', () => {
    it('should return issues that need attention', async () => {
      const response = await apiRequest('/api/needs-attention')
      
      expect(response.ok).toBe(true)
      const issues = await response.json()
      
      expect(Array.isArray(issues)).toBe(true)
      
      // Find our flagged issue
      const flaggedIssue = issues.find((i: { id: string }) => i.id === flaggedIssueId)
      expect(flaggedIssue).toBeDefined()
      expect(flaggedIssue.needs_attention).toBe(true)
    })

    it('should not return issues without the flag', async () => {
      const response = await apiRequest('/api/needs-attention')
      const issues = await response.json()
      
      // All returned issues should have needs_attention = true
      for (const issue of issues) {
        expect(issue.needs_attention).toBe(true)
      }
    })
  })

  describe('Flagging/unflagging issues', () => {
    it('should flag an issue for attention', async () => {
      // Create an unflagged issue
      const createResponse = await apiRequest(`/api/projects/${projectSlug}/issues`, {
        method: 'POST',
        body: JSON.stringify({
          title: `${testPrefix} To Flag`,
          needs_attention: false,
        }),
      })
      const { id } = await createResponse.json()

      // Flag it
      const flagResponse = await apiRequest(`/api/issues/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ needs_attention: true }),
      })
      expect(flagResponse.ok).toBe(true)

      // Verify it appears in needs-attention list
      const listResponse = await apiRequest('/api/needs-attention')
      const issues = await listResponse.json()
      const flaggedIssue = issues.find((i: { id: string }) => i.id === id)
      expect(flaggedIssue).toBeDefined()
    })

    it('should unflag an issue', async () => {
      // Unflag our originally flagged issue
      const unflagResponse = await apiRequest(`/api/issues/${flaggedIssueId}`, {
        method: 'PATCH',
        body: JSON.stringify({ needs_attention: false }),
      })
      expect(unflagResponse.ok).toBe(true)

      // Verify it no longer appears in needs-attention list
      const listResponse = await apiRequest('/api/needs-attention')
      const issues = await listResponse.json()
      const unflaggedIssue = issues.find((i: { id: string }) => i.id === flaggedIssueId)
      expect(unflaggedIssue).toBeUndefined()
    })
  })
})
