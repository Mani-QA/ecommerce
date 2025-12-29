import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Login with Standard User', async ({ page }) => {
    // Fill in credentials
    await page.fill('#username', 'standard_user');
    await page.fill('#password', 'standard123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to catalog
    await expect(page).toHaveURL(/\/catalog/);
    
    // Should show username in navbar
    await expect(page.locator('text=standard_user')).toBeVisible();
  });

  test('Login with Locked User should fail', async ({ page }) => {
    await page.fill('#username', 'locked_user');
    await page.fill('#password', 'locked123');
    
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Account is locked')).toBeVisible();
    
    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('Login with Admin User', async ({ page }) => {
    await page.fill('#username', 'admin_user');
    await page.fill('#password', 'admin123');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/catalog/);
    
    // Admin link should be visible
    await expect(page.locator('text=Admin')).toBeVisible();
  });

  test('Login with invalid credentials should fail', async ({ page }) => {
    await page.fill('#username', 'invalid_user');
    await page.fill('#password', 'wrong_password');
    
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid')).toBeVisible();
  });

  test('Logout should clear session', async ({ page }) => {
    // Login first
    await page.fill('#username', 'standard_user');
    await page.fill('#password', 'standard123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/catalog/);
    
    // Find and click logout button
    await page.click('[data-testid="logout-button"], button:has-text("Logout"), button svg.lucide-log-out');
    
    // Should redirect to home or login
    await expect(page.locator('text=Sign In')).toBeVisible();
  });
});

