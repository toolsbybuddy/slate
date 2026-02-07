import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { apiRequest, testId, cleanupTestData, serviceRequest } from '../utils'

describe('Issues API', () => {
  const testPrefix = `test-${Date.now()}`
  let projectSlug: string
  let projectId: string
  let issueId: string
  let issueNumber: number

  beforeAll(async () => {
    // Create a test project
    const response = await apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: `${testPrefix} Issues Test`,
        slug: `${testPrefix}-issues`,
        description: 'Project for testing issues',
      }),
    })
    const project = await response.json()
    projectId = project.id
    projectSlug = project.slug
  })

  afterAll(async () => {
    await cleanupTestData(testPrefix)
  })

  describe('POST /api/projects/[slug]/issues', () => {
    it('should create an issue with minimal data', async () => {
      const response = await apiRequest(`/api/projects/${projectSlug}/issues`, {
        method: 'POST',
        body: JSON.stringify({
          title: `${testPrefix} Test Issue`,
        }),
      })

      expect(response.ok).toBe(true)
      const issue = await response.json()
      
      expect(issue.id).toBeDefined()
      expect(issue.number).toBe(1) // First issue in project
      expect(issue.title).toBe(`${testPrefix} Test Issue`)
      expect(issue.status).toBe('backlog') // Default status
      expect(issue.priority).toBe('medium') // Default priority

      issueId = issue.id
      issueNumber = issue.number
    })

    it('should create an issue with full data', async () => {
      const response = await apiRequest(`/api/projects/${projectSlug}/issues`, {
        method: 'POST',
        body: JSON.stringify({
          title: `${testPrefix} Full Issue`,
          description: 'A detailed description',
          status: 'ready',
          priority: 'high',
          is_urgent: true,
          is_important: true,
        }),
      })

      expect(response.ok).toBe(true)
      const issue = await response.json()
      
      expect(issue.number).toBe(2) // Second issue
      expect(issue.description).toBe('A detailed description')
      expect(issue.status).toBe('ready')
      expect(issue.priority).toBe('high')
      expect(issue.is_urgent).toBe(true)
      expect(issue.is_important).toBe(true)
    })

    it('should auto-increment issue numbers', async () => {
      const response = await apiRequest(`/api/projects/${projectSlug}/issues`, {
        method: 'POST',
        body: JSON.stringify({ title: `${testPrefix} Third Issue` }),
      })

      const issue = await response.json()
      expect(issue.number).toBe(3)
    })
  })

  describe('GET /api/issues/[id]', () => {
    it('should get issue by ID', async () => {
      const response = await apiRequest(`/api/issues/${issueId}`)
      
      expect(response.ok).toBe(true)
      const issue = await response.json()
      
      expect(issue.id).toBe(issueId)
      expect(issue.title).toBe(`${testPrefix} Test Issue`)
    })

    it('should return 404 for non-existent issue', async () => {
      const response = await apiRequest('/api/issues/00000000-0000-0000-0000-000000000000')
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/issues/[id]', () => {
    it('should update issue title', async () => {
      const response = await apiRequest(`/api/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: `${testPrefix} Updated Title`,
        }),
      })

      expect(response.ok).toBe(true)
      const issue = await response.json()
      expect(issue.title).toBe(`${testPrefix} Updated Title`)
    })

    it('should update issue status', async () => {
      const response = await apiRequest(`/api/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'in_progress',
        }),
      })

      expect(response.ok).toBe(true)
      const issue = await response.json()
      expect(issue.status).toBe('in_progress')
    })

    it('should update multiple fields at once', async () => {
      const response = await apiRequest(`/api/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          priority: 'low',
          is_urgent: false,
          needs_attention: true,
        }),
      })

      expect(response.ok).toBe(true)
      const issue = await response.json()
      expect(issue.priority).toBe('low')
      expect(issue.is_urgent).toBe(false)
      expect(issue.needs_attention).toBe(true)
    })
  })

  describe('DELETE /api/issues/[id]', () => {
    it('should delete an issue', async () => {
      // Create an issue to delete
      const createResponse = await apiRequest(`/api/projects/${projectSlug}/issues`, {
        method: 'POST',
        body: JSON.stringify({ title: `${testPrefix} To Delete` }),
      })
      const { id } = await createResponse.json()

      // Delete it
      const deleteResponse = await apiRequest(`/api/issues/${id}`, {
        method: 'DELETE',
      })
      expect(deleteResponse.ok).toBe(true)

      // Verify it's gone
      const getResponse = await apiRequest(`/api/issues/${id}`)
      expect(getResponse.status).toBe(404)
    })
  })
})
