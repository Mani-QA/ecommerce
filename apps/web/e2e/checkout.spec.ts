import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cart before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('cart-storage'));
  });

  test('Login with Standard User - Complete checkout flow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#username', 'standard_user');
    await page.fill('#password', 'standard123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/catalog/);
    
    // Add item to cart
    await page.locator('button:has-text("Add")').first().click();
    
    // Go to cart
    await page.goto('/cart');
    await expect(page.locator('text=Proceed to Checkout')).toBeVisible();
    
    // Go to checkout
    await page.click('button:has-text("Proceed to Checkout")');
    await expect(page).toHaveURL(/\/checkout/);
    
    // Fill shipping information
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('textarea[name="address"]', '123 Test Street\nTest City, TC 12345');
    
    // Fill payment information
    await page.fill('input[name="cardNumber"]', '4111111111111111');
    await page.fill('input[name="expiry"]', '12/28');
    await page.fill('input[name="cvv"]', '123');
    await page.fill('input[name="nameOnCard"]', 'John Doe');
    
    // Submit order
    await page.click('button:has-text("Place Order")');
    
    // Should redirect to order confirmation
    await expect(page).toHaveURL(/\/orders\/\d+/);
    await expect(page.locator('text=Order Confirmed')).toBeVisible();
  });

  test('Login with Standard User - Invalid card should show error', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#username', 'standard_user');
    await page.fill('#password', 'standard123');
    await page.click('button[type="submit"]');
    
    // Add item and go to checkout
    await page.goto('/catalog');
    await page.locator('button:has-text("Add")').first().click();
    await page.goto('/checkout');
    
    // Fill form with invalid card
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('textarea[name="address"]', '123 Test Street');
    await page.fill('input[name="cardNumber"]', '1234567890123456'); // Invalid
    await page.fill('input[name="expiry"]', '12/28');
    await page.fill('input[name="cvv"]', '123');
    await page.fill('input[name="nameOnCard"]', 'John Doe');
    
    await page.click('button:has-text("Place Order")');
    
    // Should show error
    await expect(page.locator('text=Invalid card')).toBeVisible();
  });

  test('Unauthenticated user should be redirected to login', async ({ page }) => {
    // Try to access checkout without login
    await page.goto('/checkout');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

