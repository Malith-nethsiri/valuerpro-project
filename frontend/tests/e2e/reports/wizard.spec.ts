import { test, expect } from '@playwright/test';
import { createAITestHelpers } from '../utils/ai-test-helpers';

test.describe('Report Creation Wizard @visual @accessibility @e2e', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in (this could be handled in global setup)
    await page.goto('/reports/create');
  });

  test('should navigate through wizard steps with AI guidance', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Wait for wizard to load
    await ai.waitForContentToLoad('Report Info');
    
    // Run accessibility audit on initial load
    await ai.runAccessibilityAudit({
      reportViolations: true
    });
    
    // Validate wizard layout
    await ai.validateVisualLayout({
      checkAlignment: true,
      checkOverlaps: true,
      checkVisibility: true
    });
    
    // Take baseline screenshot
    await expect(page).toHaveScreenshot('wizard-step-1-report-info.png');
    
    // Step 1: Report Info - AI-powered form filling
    const reportInfoData = {
      'purpose': 'Sale/Purchase',
      'report date': '2024-12-01',
      'inspection date': '2024-11-30',
      'basis of value': 'Market Value',
      'currency': 'LKR'
    };
    
    await ai.fillFormIntelligently(reportInfoData);
    
    // Move to next step
    const nextButton = await ai.findElementIntelligently('next', [
      'button:has-text("Next")',
      'button:has-text("Continue")',
      '[data-testid="next-step"]'
    ]);
    await nextButton.click();
    
    // Step 2: Identification & Title
    await ai.waitForContentToLoad('Identification');
    
    // Performance check - step transitions should be smooth
    const performance = await ai.analyzePagePerformance();
    expect(performance.isLoadTimeFast).toBeTruthy();
    
    await expect(page).toHaveScreenshot('wizard-step-2-identification.png');
    
    const identificationData = {
      'lot number': 'LOT123',
      'plan number': 'PLAN456',
      'extent': '50',
      'land name': 'Test Property'
    };
    
    await ai.fillFormIntelligently(identificationData);
    await nextButton.click();
    
    // Continue through remaining steps...
    await ai.waitForContentToLoad('Location');
    await expect(page).toHaveScreenshot('wizard-step-3-location.png');
  });

  test('should handle wizard navigation and validation intelligently', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Test step navigation without filling required fields
    const nextButton = await ai.findElementIntelligently('next');
    await nextButton.click();
    
    // AI should detect validation errors
    await ai.waitForContentToLoad();
    
    // Look for validation messages using multiple strategies
    const validationErrors = await page.locator([
      '[role="alert"]',
      '.error-message',
      '[aria-invalid="true"]',
      '.field-error',
      '[data-testid*="error"]'
    ].join(', ')).all();
    
    expect(validationErrors.length).toBeGreaterThan(0);
    
    // Verify each validation error has proper accessibility attributes
    for (const error of validationErrors) {
      const isVisible = await error.isVisible();
      if (isVisible) {
        const attributes = await error.evaluate(el => ({
          role: el.getAttribute('role'),
          ariaLive: el.getAttribute('aria-live'),
          ariaAtomic: el.getAttribute('aria-atomic')
        }));
        
        // Should have proper ARIA attributes for screen readers
        expect(
          attributes.role === 'alert' || 
          attributes.ariaLive || 
          attributes.ariaAtomic
        ).toBeTruthy();
      }
    }
  });

  test('should auto-save form data and preserve state @persistence', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Fill first step
    await ai.fillFormIntelligently({
      'purpose': 'Bank valuation',
      'report date': '2024-12-01'
    });
    
    // Wait for auto-save (check for loading indicators or save confirmations)
    await page.waitForTimeout(2000); // Allow auto-save to trigger
    
    // Refresh page to test persistence
    await page.reload();
    await ai.waitForContentToLoad('Report Info');
    
    // Verify data persistence
    const purposeField = await ai.findElementIntelligently('purpose');
    const selectedValue = await purposeField.evaluate((el: Element) => {
      return (el as HTMLSelectElement).value;
    });
    
    expect(selectedValue).toBe('Bank valuation');
    
    // Performance check - page reload should be fast with cached data
    const performance = await ai.analyzePagePerformance();
    expect(performance.performanceScore).toBeGreaterThan(75);
  });

  test('should handle dynamic form fields and conditional logic', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Navigate to a step with conditional fields (e.g., Buildings step)
    // This would require navigating through previous steps first
    
    // Move through steps to reach buildings section
    const stepsToComplete = [
      { 'purpose': 'Sale/Purchase', 'inspection date': '2024-11-30' },
      { 'lot number': 'TEST123', 'plan number': 'PLAN123' },
      { 'district': 'Colombo', 'province': 'Western' },
      {} // Site step
    ];
    
    for (let i = 0; i < stepsToComplete.length; i++) {
      await ai.fillFormIntelligently(stepsToComplete[i]);
      const nextBtn = await ai.findElementIntelligently('next');
      await nextBtn.click();
      await ai.waitForContentToLoad();
    }
    
    // Now at Buildings step - test conditional logic
    await ai.waitForContentToLoad('Buildings');
    
    // Select building type that shows/hides additional fields
    const buildingTypeField = await ai.findElementIntelligently('building type', [
      'select[name*="building"]',
      'select[name*="type"]'
    ]);
    
    if (await buildingTypeField.count() > 0) {
      await buildingTypeField.selectOption('residential');
      
      // Wait for conditional fields to appear
      await page.waitForTimeout(1000);
      
      // Verify conditional fields are now visible
      const conditionalFields = page.locator('[data-conditional="true"], [data-depends-on]');
      const visibleConditionalFields = await conditionalFields.evaluateAll(
        elements => elements.filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }).length
      );
      
      console.log(`Found ${visibleConditionalFields} visible conditional fields`);
    }
  });

  test('should validate wizard completion and review step', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Complete all wizard steps with minimal data
    const wizardData = [
      { 'purpose': 'Sale/Purchase', 'inspection date': '2024-11-30' },
      { 'lot number': 'TEST123', 'plan number': 'PLAN123', 'extent': '25' },
      { 'district': 'Colombo', 'province': 'Western' },
      {}, // Site
      {}, // Buildings
      {}, // Utilities
      {}, // Planning
      {}, // Locality
      { 'market value': '25000000' }, // Valuation
      {}, // Legal
      {}, // Appendices
    ];
    
    // Navigate through all steps
    for (const stepData of wizardData) {
      await ai.fillFormIntelligently(stepData);
      const nextBtn = await ai.findElementIntelligently('next');
      await nextBtn.click();
      await ai.waitForContentToLoad();
    }
    
    // Should now be at Review step
    await ai.waitForContentToLoad('Review');
    
    // Verify review step shows all entered data
    const reviewContent = await page.textContent('body');
    expect(reviewContent).toContain('TEST123'); // Lot number
    expect(reviewContent).toContain('PLAN123'); // Plan number
    expect(reviewContent).toContain('Colombo'); // District
    
    // Check for generate button
    const generateButton = await ai.findElementIntelligently('generate', [
      'button:has-text("Generate")',
      'button:has-text("Export")',
      'button:has-text("Create")'
    ]);
    
    expect(await generateButton.isVisible()).toBeTruthy();
    
    // Final accessibility check
    await ai.runAccessibilityAudit();
    
    // Final visual test
    await expect(page).toHaveScreenshot('wizard-review-step.png');
  });

  test('should handle mobile wizard navigation @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const ai = createAITestHelpers(page);
    
    await page.goto('/reports/create');
    await ai.waitForContentToLoad();
    
    // Mobile-specific accessibility check
    await ai.runAccessibilityAudit();
    
    // Check mobile navigation
    const mobileNavButton = page.locator('[data-testid="mobile-nav"], .mobile-menu-button, button[aria-label*="menu"]').first();
    
    if (await mobileNavButton.count() > 0) {
      await mobileNavButton.tap();
      await page.waitForTimeout(500);
    }
    
    // Verify no overlapping elements on mobile
    await ai.validateVisualLayout({
      checkOverlaps: true,
      checkVisibility: true
    });
    
    // Test mobile form interaction
    const firstField = page.locator('input, select, textarea').first();
    if (await firstField.count() > 0) {
      await firstField.tap();
      await page.waitForTimeout(1000); // Wait for mobile keyboard
      
      // Ensure keyboard doesn't break layout
      await ai.validateVisualLayout({ checkOverlaps: true });
    }
    
    await expect(page).toHaveScreenshot('wizard-mobile.png');
  });
});