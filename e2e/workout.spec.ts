import { test, expect } from '@playwright/test'

test.describe('Workout page (unauthenticated)', () => {
  test('redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/workout')
    await page.waitForURL(/login/, { timeout: 6000 })
    expect(page.url()).toContain('login')
  })

  test('workout history redirects to login', async ({ page }) => {
    await page.goto('/workout/history')
    await page.waitForURL(/login/, { timeout: 6000 })
    expect(page.url()).toContain('login')
  })
})

test.describe('Landing page', () => {
  test('has SBH in title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/SBH/)
  })

  test('shows app name or hero text', async ({ page }) => {
    await page.goto('/')
    const body = await page.textContent('body')
    expect(body).toMatch(/SBH|Science Based Health/i)
  })

  test('CTA links to register or login', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('link', { name: /get started|sign in|login|register/i })
    await expect(cta.first()).toBeVisible()
  })
})

test.describe('Glucose page (unauthenticated)', () => {
  test('redirects to login', async ({ page }) => {
    await page.goto('/glucose')
    await page.waitForURL(/login/, { timeout: 6000 })
    expect(page.url()).toContain('login')
  })

  test('/glucose/trends redirects to login', async ({ page }) => {
    await page.goto('/glucose/trends')
    await page.waitForURL(/login/, { timeout: 6000 })
    expect(page.url()).toContain('login')
  })
})
