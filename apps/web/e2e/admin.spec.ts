import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test('Login with Admin User - Access admin dashboard', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('#username', 'admin_user');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/catalog/);
    
    // Navigate to admin
    await page.click('text=Admin');
    await expect(page).toHaveURL(/\/admin/);
    
    // Should see admin dashboard
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    await expect(page.locator('text=Overview')).toBeVisible();
    await expect(page.locator('text=Products')).toBeVisible();
    await expect(page.locator('text=Orders')).toBeVisible();
  });

  test('Login with Admin User - View inventory', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('#username', 'admin_user');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Go to admin
    await page.goto('/admin');
    
    // Click on Products tab
    await page.click('button:has-text("Products")');
    
    // Should see product inventory
    await expect(page.locator('text=Inventory Management')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('Login with Admin User - View orders', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('#username', 'admin_user');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    
    // Go to admin
    await page.goto('/admin');
    
    // Click on Orders tab
    await page.click('button:has-text("Orders")');
    
    // Should see order history
    await expect(page.locator('text=Order History')).toBeVisible();
  });

  test('Login with Standard User - Cannot access admin', async ({ page }) => {
    // Login as standard user
    await page.goto('/login');
    await page.fill('#username', 'standard_user');
    await page.fill('#password', 'standard123');
    await page.click('button[type="submit"]');
    
    // Try to access admin directly
    await page.goto('/admin');
    
    // Should redirect to home
    await expect(page).not.toHaveURL(/\/admin/);
  });
});

