import { test, expect } from '@playwright/test'

test('landing page loads and shows CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/HealthOS/)
  // Should have a sign-in or get-started button
  const cta = page.getByRole('link', { name: /get started|sign in|login/i })
  await expect(cta.first()).toBeVisible()
})

test('unauthenticated dashboard redirects to login', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForURL(/login/, { timeout: 5000 })
  expect(page.url()).toContain('login')
})

test('pricing page renders all three tiers', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page.getByText('Free')).toBeVisible()
  await expect(page.getByText('Pro')).toBeVisible()
  await expect(page.getByText('Premium')).toBeVisible()
})
