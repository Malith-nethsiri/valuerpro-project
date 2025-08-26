import { test, expect } from '@playwright/test';
import { createAITestHelpers } from '../utils/ai-test-helpers';

test.describe('Authentication - Login Flow @accessibility @visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('should display login form with proper accessibility', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Wait for page to load completely
    await ai.waitForContentToLoad('Sign in to your account');
    
    // Run comprehensive accessibility audit
    const violations = await ai.runAccessibilityAudit({
      includeTags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
      reportViolations: true
    });
    
    expect(violations.length).toBe(0);
    
    // Verify visual layout
    await ai.validateVisualLayout({
      checkAlignment: true,
      checkOverlaps: true,
      checkVisibility: true
    });
    
    // Check for essential form elements using AI-powered detection
    const emailField = await ai.findElementIntelligently('email');
    const passwordField = await ai.findElementIntelligently('password');
    const loginButton = await ai.findElementIntelligently('sign in', [
      'button[type="submit"]',
      '[data-testid="login-button"]'
    ]);
    
    expect(await emailField.isVisible()).toBeTruthy();
    expect(await passwordField.isVisible()).toBeTruthy();
    expect(await loginButton.isVisible()).toBeTruthy();
    
    // Visual regression test
    await expect(page).toHaveScreenshot('login-form.png');
  });

  test('should handle intelligent form filling and validation', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Test form with various input strategies
    await ai.fillFormIntelligently({
      'email': 'test@example.com',
      'password': 'wrongpassword'
    });
    
    const loginButton = await ai.findElementIntelligently('sign in');
    await loginButton.click();
    
    // Wait for error message to appear
    await ai.waitForContentToLoad('Invalid credentials');
    
    // Verify error handling accessibility
    const errorMessage = page.locator('[role="alert"], .error-message, [data-testid*="error"]').first();
    await expect(errorMessage).toBeVisible();
    
    // Check that error message has proper ARIA attributes
    const ariaLive = await errorMessage.getAttribute('aria-live');
    const role = await errorMessage.getAttribute('role');
    
    expect(ariaLive || role).toBeTruthy();
    
    // Performance check - login attempt should be fast
    const performance = await ai.analyzePagePerformance();
    expect(performance.performanceScore).toBeGreaterThan(70);
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Create test user credentials (in real app, this would come from test data)
    const testCredentials = {
      'email': 'testuser@valuerpro.com',
      'password': 'TestPassword123!'
    };
    
    // Fill form intelligently
    await ai.fillFormIntelligently(testCredentials);
    
    const loginButton = await ai.findElementIntelligently('sign in');
    
    // Monitor network and performance during login
    const [response] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/auth/login')),
      loginButton.click()
    ]);
    
    expect(response.status()).toBe(200);
    
    // Wait for successful redirect
    await page.waitForURL('**/dashboard');
    
    // Verify we're logged in
    await ai.waitForContentToLoad('Dashboard', 15000);
    
    // Check performance of login flow
    const performance = await ai.analyzePagePerformance();
    expect(performance.isLoadTimeFast).toBeTruthy();
    
    // Visual verification of logged-in state
    await expect(page).toHaveScreenshot('dashboard-after-login.png');
  });

  test('should handle mobile responsive login @mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const ai = createAITestHelpers(page);
    
    await page.goto('/auth/login');
    await ai.waitForContentToLoad();
    
    // Check mobile accessibility
    await ai.runAccessibilityAudit();
    
    // Verify mobile layout
    await ai.validateVisualLayout({
      checkOverlaps: true,
      checkVisibility: true
    });
    
    // Test touch interactions
    const emailField = await ai.findElementIntelligently('email');
    await emailField.tap();
    
    // Verify virtual keyboard doesn't break layout
    await page.waitForTimeout(1000); // Wait for virtual keyboard
    
    await ai.validateVisualLayout({
      checkOverlaps: true
    });
    
    // Mobile screenshot test
    await expect(page).toHaveScreenshot('login-mobile.png');
  });

  test('should validate form fields with AI-powered error detection', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Test empty form submission
    const loginButton = await ai.findElementIntelligently('sign in');
    await loginButton.click();
    
    // AI should detect validation errors
    await ai.waitForContentToLoad();
    
    const emailField = await ai.findElementIntelligently('email');
    const passwordField = await ai.findElementIntelligently('password');
    
    // Check for validation states
    const emailValidation = await emailField.evaluate(el => {
      return {
        hasAriaInvalid: el.hasAttribute('aria-invalid'),
        hasAriaDescribedby: el.hasAttribute('aria-describedby'),
        validationMessage: (el as HTMLInputElement).validationMessage
      };
    });
    
    const passwordValidation = await passwordField.evaluate(el => {
      return {
        hasAriaInvalid: el.hasAttribute('aria-invalid'),
        hasAriaDescribedby: el.hasAttribute('aria-describedby'),
        validationMessage: (el as HTMLInputElement).validationMessage
      };
    });
    
    // Ensure proper validation feedback
    expect(emailValidation.hasAriaInvalid || emailValidation.validationMessage).toBeTruthy();
    expect(passwordValidation.hasAriaInvalid || passwordValidation.validationMessage).toBeTruthy();
    
    // Test invalid email format
    await ai.fillFormIntelligently({
      'email': 'invalid-email',
      'password': 'somepassword'
    });
    
    await loginButton.click();
    
    // Should show email format error
    const errorElements = page.locator('[role="alert"], .error, [aria-invalid="true"] + *');
    await expect(errorElements.first()).toBeVisible();
  });
});