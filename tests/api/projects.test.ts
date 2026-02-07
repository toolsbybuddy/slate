import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { apiRequest, testId, cleanupTestData } from '../utils'

describe('Projects API', () => {
  const testPrefix = `test-${Date.now()}`
  let createdProjectId: string
  let createdProjectSlug: string

  afterAll(async () => {
    await cleanupTestData(testPrefix)
  })

  describe('GET /api/projects', () => {
    it('should return list of projects', async () => {
      const response = await apiRequest('/api/projects')
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: `${testPrefix} Project`,
        slug: `${testPrefix}-project`,
        description: 'A test project',
      }

      const response = await apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectData),
      })

      expect(response.ok).toBe(true)
      const project = await response.json()
      
      expect(project.id).toBeDefined()
      expect(project.name).toBe(projectData.name)
      expect(project.slug).toBe(projectData.slug)
      expect(project.description).toBe(projectData.description)
      expect(project.is_archived).toBe(false)

      createdProjectId = project.id
      createdProjectSlug = project.slug
    })

    it('should reject duplicate slugs', async () => {
      const response = await apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Duplicate Test',
          slug: createdProjectSlug, // Same slug as created project
        }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(409) // Conflict for duplicate
    })

    it('should reject invalid slugs', async () => {
      const response = await apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Invalid Slug Test',
          slug: 'Has Spaces And CAPS!',
        }),
      })

      expect(response.ok).toBe(false)
    })
  })

  describe('GET /api/projects/[slug]/issues', () => {
    it('should return issues for a project', async () => {
      const response = await apiRequest(`/api/projects/${createdProjectSlug}/issues`)
      
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should return 404 for non-existent project', async () => {
      const response = await apiRequest('/api/projects/nonexistent-project-xyz/issues')
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })
})
