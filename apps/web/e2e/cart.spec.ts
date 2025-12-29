import { test, expect } from '@playwright/test';

test.describe('Shopping Cart', () => {
  test('Login with Standard User - Add item to cart', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('#username', 'standard_user');
    await page.fill('#password', 'standard123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/catalog/);
    
    // Add first product to cart
    const addButton = page.locator('button:has-text("Add")').first();
    await addButton.click();
    
    // Button should change to "In Cart"
    await expect(page.locator('button:has-text("In Cart")').first()).toBeVisible();
    
    // Cart count should show 1
    await expect(page.locator('.cart-count, [class*="cart"] span:has-text("1")')).toBeVisible();
  });

  test('Login with Standard User - View cart with items', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#username', 'standard_user');
    await page.fill('#password', 'standard123');
    await page.click('button[type="submit"]');
    
    // Add item
    await page.goto('/catalog');
    await page.locator('button:has-text("Add")').first().click();
    
    // Go to cart
    await page.goto('/cart');
    
    // Should show cart items
    await expect(page.locator('text=Shopping Cart')).toBeVisible();
    await expect(page.locator('text=Proceed to Checkout')).toBeVisible();
  });

  test('Login with Standard User - Update cart quantity', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#username', 'standard_user');
    await page.fill('#password', 'standard123');
    await page.click('button[type="submit"]');
    
    // Add item
    await page.goto('/catalog');
    await page.locator('button:has-text("Add")').first().click();
    
    // Go to cart
    await page.goto('/cart');
    
    // Find quantity controls and increase
    const plusButton = page.locator('button svg.lucide-plus').first();
    if (await plusButton.isVisible()) {
      await plusButton.click();
      
      // Quantity should be 2
      await expect(page.locator('span:has-text("2")')).toBeVisible();
    }
  });

  test('Login with Standard User - Remove item from cart', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#username', 'standard_user');
    await page.fill('#password', 'standard123');
    await page.click('button[type="submit"]');
    
    // Add item
    await page.goto('/catalog');
    await page.locator('button:has-text("Add")').first().click();
    
    // Go to cart
    await page.goto('/cart');
    
    // Remove item
    const removeButton = page.locator('button svg.lucide-trash-2').first();
    await removeButton.click();
    
    // Cart should be empty
    await expect(page.locator('text=Your cart is empty')).toBeVisible();
  });
});

