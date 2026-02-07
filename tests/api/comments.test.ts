import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { apiRequest, cleanupTestData } from '../utils'

describe('Comments API', () => {
  const testPrefix = `test-${Date.now()}`
  let projectSlug: string
  let issueId: string
  let commentId: string

  beforeAll(async () => {
    // Create a test project
    const projectResponse = await apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: `${testPrefix} Comments Test`,
        slug: `${testPrefix}-comments`,
      }),
    })
    const project = await projectResponse.json()
    projectSlug = project.slug

    // Create a test issue
    const issueResponse = await apiRequest(`/api/projects/${projectSlug}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title: `${testPrefix} Issue for Comments` }),
    })
    const issue = await issueResponse.json()
    issueId = issue.id
  })

  afterAll(async () => {
    await cleanupTestData(testPrefix)
  })

  describe('POST /api/issues/[id]/comments', () => {
    it('should create a comment', async () => {
      const response = await apiRequest(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: 'This is a test comment',
        }),
      })

      expect(response.ok).toBe(true)
      const comment = await response.json()
      
      expect(comment.id).toBeDefined()
      expect(comment.body).toBe('This is a test comment')
      expect(comment.issue_id).toBe(issueId)

      commentId = comment.id
    })

    it('should reject empty comment', async () => {
      const response = await apiRequest(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: '',
        }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })

    it('should reject comment without body', async () => {
      const response = await apiRequest(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        body: JSON.stringify({}),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/issues/[id]/comments', () => {
    it('should list comments for an issue', async () => {
      const response = await apiRequest(`/api/issues/${issueId}/comments`)
      
      expect(response.ok).toBe(true)
      const comments = await response.json()
      
      expect(Array.isArray(comments)).toBe(true)
      expect(comments.length).toBeGreaterThanOrEqual(1)
      
      // Find our comment
      const ourComment = comments.find((c: { id: string }) => c.id === commentId)
      expect(ourComment).toBeDefined()
      expect(ourComment.body).toBe('This is a test comment')
    })

    it('should return 404 for non-existent issue', async () => {
      const response = await apiRequest('/api/issues/00000000-0000-0000-0000-000000000000/comments')
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })
})
