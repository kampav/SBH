import { test, expect } from '@playwright/test'

test.describe('Authentication flow', () => {
  test('login page renders email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login')
    const registerLink = page.getByRole('link', { name: /register|sign up|create/i })
    await expect(registerLink.first()).toBeVisible()
  })

  test('register page renders required fields', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('unauthenticated /nutrition redirects to login', async ({ page }) => {
    await page.goto('/nutrition')
    await page.waitForURL(/login/, { timeout: 6000 })
    expect(page.url()).toContain('login')
  })

  test('unauthenticated /metrics redirects to login', async ({ page }) => {
    await page.goto('/metrics')
    await page.waitForURL(/login/, { timeout: 6000 })
    expect(page.url()).toContain('login')
  })

  test('unauthenticated /glucose redirects to login', async ({ page }) => {
    await page.goto('/glucose')
    await page.waitForURL(/login/, { timeout: 6000 })
    expect(page.url()).toContain('login')
  })
})
