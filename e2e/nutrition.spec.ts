import { test, expect } from '@playwright/test'

test.describe('Nutrition page (unauthenticated)', () => {
  test('redirects unauthenticated user to /login', async ({ page }) => {
    await page.goto('/nutrition')
    await page.waitForURL(/login/, { timeout: 6000 })
    expect(page.url()).toContain('login')
  })
})

test.describe('Login page UI', () => {
  test('displays sign-in heading', async ({ page }) => {
    await page.goto('/login')
    const heading = page.getByRole('heading')
    await expect(heading.first()).toBeVisible()
  })

  test('submit button is present and visible', async ({ page }) => {
    await page.goto('/login')
    const btn = page.getByRole('button', { name: /sign in|log in|continue/i })
    await expect(btn.first()).toBeVisible()
  })

  test('Google sign-in option is present', async ({ page }) => {
    await page.goto('/login')
    const googleBtn = page.getByRole('button', { name: /google/i })
    await expect(googleBtn.first()).toBeVisible()
  })
})

test.describe('Pricing page', () => {
  test('shows monthly/yearly toggle', async ({ page }) => {
    await page.goto('/pricing')
    const toggle = page.getByRole('button', { name: /monthly|yearly|annual/i })
    await expect(toggle.first()).toBeVisible()
  })

  test('all three tiers display price info', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByText('Free')).toBeVisible()
    await expect(page.getByText('Pro')).toBeVisible()
    await expect(page.getByText('Premium')).toBeVisible()
  })
})
