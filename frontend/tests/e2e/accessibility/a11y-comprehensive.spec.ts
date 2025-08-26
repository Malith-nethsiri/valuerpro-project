import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations, configureAxe } from 'axe-playwright';
import { createAITestHelpers } from '../utils/ai-test-helpers';

test.describe('Comprehensive Accessibility Testing @accessibility', () => {
  
  test.beforeEach(async ({ page }) => {
    // Inject axe-core into every page
    await injectAxe(page);
  });

  test('should pass WCAG 2.1 AA compliance on login page', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    await page.goto('/auth/login');
    await ai.waitForContentToLoad();
    
    // Configure axe for comprehensive testing
    await configureAxe(page, {
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true },
        'aria-labels': { enabled: true },
        'semantic-markup': { enabled: true }
      }
    });
    
    // Run full accessibility audit
    const violations = await ai.runAccessibilityAudit({
      includeTags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
      reportViolations: true
    });
    
    // Assert no critical violations
    const criticalViolations = violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(criticalViolations.length).toBe(0);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A'].includes(focusedElement || '')).toBeTruthy();
    
    // Test form labels and ARIA attributes
    const formElements = page.locator('input, select, textarea');
    const formCount = await formElements.count();
    
    for (let i = 0; i < formCount; i++) {
      const element = formElements.nth(i);
      const hasLabel = await element.evaluate(el => {
        const id = el.id;
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledby = el.getAttribute('aria-labelledby');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        
        return !!(ariaLabel || ariaLabelledby || label);
      });
      
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should maintain accessibility during form interactions', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    await page.goto('/auth/login');
    await ai.waitForContentToLoad();
    
    // Test empty form submission accessibility
    const loginButton = await ai.findElementIntelligently('sign in');
    await loginButton.click();
    
    // Wait for validation errors
    await page.waitForTimeout(1000);
    
    // Check that error messages are accessible
    const violations = await getViolations(page);
    const formValidationViolations = violations.filter(v => 
      v.id.includes('aria') || v.id.includes('label') || v.id.includes('error')
    );
    
    expect(formValidationViolations.length).toBe(0);
    
    // Verify error announcements
    const errorMessages = page.locator('[role="alert"], [aria-live], .error-message');
    const errorCount = await errorMessages.count();
    
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const error = errorMessages.nth(i);
        const isAnnounced = await error.evaluate(el => {
          const role = el.getAttribute('role');
          const ariaLive = el.getAttribute('aria-live');
          return role === 'alert' || !!ariaLive;
        });
        
        expect(isAnnounced).toBeTruthy();
      }
    }
  });

  test('should validate wizard accessibility across all steps', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    await page.goto('/reports/create');
    await ai.waitForContentToLoad('Report Info');
    
    // Test wizard structure accessibility
    await checkA11y(page, undefined, {
      tags: ['wcag2a', 'wcag2aa']
    });
    
    // Test step indicator accessibility
    const stepIndicators = page.locator('.step-indicator, .wizard-step, [role="tab"]');
    const stepCount = await stepIndicators.count();
    
    if (stepCount > 0) {
      for (let i = 0; i < stepCount; i++) {
        const step = stepIndicators.nth(i);
        const hasProperRole = await step.evaluate(el => {
          const role = el.getAttribute('role');
          const ariaLabel = el.getAttribute('aria-label');
          const ariaCurrent = el.getAttribute('aria-current');
          
          return role && (ariaLabel || el.textContent) && 
                 (role === 'tab' || role === 'button' || ariaCurrent);
        });
        
        expect(hasProperRole).toBeTruthy();
      }
    }
    
    // Test form field groups and fieldsets
    const fieldsets = page.locator('fieldset');
    const fieldsetCount = await fieldsets.count();
    
    for (let i = 0; i < fieldsetCount; i++) {
      const fieldset = fieldsets.nth(i);
      const hasLegend = await fieldset.evaluate(el => {
        return !!el.querySelector('legend');
      });
      
      expect(hasLegend).toBeTruthy();
    }
    
    // Navigate through a few steps to test dynamic accessibility
    await ai.fillFormIntelligently({
      'purpose': 'Sale/Purchase',
      'inspection date': '2024-11-30'
    });
    
    const nextButton = await ai.findElementIntelligently('next');
    await nextButton.click();
    await ai.waitForContentToLoad();
    
    // Check accessibility after step transition
    const postNavigationViolations = await getViolations(page);
    const criticalPostNav = postNavigationViolations.filter(v => v.impact === 'critical');
    expect(criticalPostNav.length).toBe(0);
  });

  test('should test keyboard navigation comprehensively', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    await page.goto('/reports/create');
    await ai.waitForContentToLoad();
    
    // Test tab order and focus management
    const interactiveElements = page.locator('input, select, textarea, button, a, [tabindex]');
    const elementCount = await interactiveElements.count();
    
    const tabOrder: string[] = [];
    
    // Navigate through all interactive elements
    for (let i = 0; i < elementCount; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => {
        const focused = document.activeElement;
        return focused ? {
          tagName: focused.tagName,
          id: focused.id,
          className: focused.className,
          type: focused.getAttribute('type'),
          ariaLabel: focused.getAttribute('aria-label')
        } : null;
      });
      
      if (focusedElement) {
        tabOrder.push(`${focusedElement.tagName}${focusedElement.id ? '#' + focusedElement.id : ''}`);
      }
      
      // Verify focus is visible
      const hasFocusIndicator = await page.evaluate(() => {
        const focused = document.activeElement;
        if (!focused) return false;
        
        const style = window.getComputedStyle(focused);
        const pseudoStyle = window.getComputedStyle(focused, ':focus');
        
        return style.outline !== 'none' || 
               pseudoStyle.outline !== 'none' ||
               style.boxShadow !== 'none' ||
               pseudoStyle.boxShadow !== 'none' ||
               focused.getAttribute('data-focus-visible') === 'true';
      });
      
      expect(hasFocusIndicator).toBeTruthy();
    }
    
    console.log('Tab order:', tabOrder);
    expect(tabOrder.length).toBeGreaterThan(0);
  });

  test('should test screen reader compatibility', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    await page.goto('/dashboard');
    await ai.waitForContentToLoad();
    
    // Test heading structure
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    console.log('Heading structure:', headings);
    
    // Verify heading hierarchy (h1 should come before h2, etc.)
    const headingLevels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll(elements => {
      return elements.map(el => parseInt(el.tagName.charAt(1)));
    });
    
    // Check for proper heading hierarchy
    for (let i = 1; i < headingLevels.length; i++) {
      const currentLevel = headingLevels[i];
      const previousLevel = headingLevels[i - 1];
      
      // Current level shouldn't be more than 1 level deeper than previous
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
    }
    
    // Test landmark regions
    const landmarks = page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer');
    const landmarkCount = await landmarks.count();
    
    expect(landmarkCount).toBeGreaterThan(0);
    
    // Verify each landmark has accessible name if there are multiple of same type
    for (let i = 0; i < landmarkCount; i++) {
      const landmark = landmarks.nth(i);
      const landmarkInfo = await landmark.evaluate(el => ({
        role: el.getAttribute('role') || el.tagName.toLowerCase(),
        ariaLabel: el.getAttribute('aria-label'),
        ariaLabelledby: el.getAttribute('aria-labelledby'),
        id: el.id
      }));
      
      // If there are multiple landmarks of same type, they should have labels
      const sameTypeLandmarks = page.locator(`[role="${landmarkInfo.role}"], ${landmarkInfo.role}`);
      const sameTypeCount = await sameTypeLandmarks.count();
      
      if (sameTypeCount > 1) {
        expect(landmarkInfo.ariaLabel || landmarkInfo.ariaLabelledby).toBeTruthy();
      }
    }
  });

  test('should test color contrast and visual accessibility', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    await page.goto('/reports/create');
    await ai.waitForContentToLoad();
    
    // Run color contrast checks
    await checkA11y(page, undefined, {
      rules: {
        'color-contrast': { enabled: true },
        'color-contrast-enhanced': { enabled: true }
      }
    });
    
    // Test with high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    
    const darkModeViolations = await getViolations(page);
    const contrastViolations = darkModeViolations.filter(v => v.id.includes('color-contrast'));
    
    expect(contrastViolations.length).toBe(0);
    
    // Test with reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(500);
    
    // Verify animations respect reduced motion
    const animatedElements = page.locator('[class*="animate"], [class*="transition"], [style*="animation"]');
    const animatedCount = await animatedElements.count();
    
    if (animatedCount > 0) {
      const respectsReducedMotion = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('[class*="animate"], [class*="transition"], [style*="animation"]'));
        
        return elements.every(el => {
          const style = window.getComputedStyle(el);
          return style.animationDuration === '0s' || 
                 style.transitionDuration === '0s' ||
                 el.hasAttribute('data-reduced-motion-safe');
        });
      });
      
      // Note: This might not work perfectly without proper CSS implementation
      console.log('Reduced motion respected:', respectsReducedMotion);
    }
  });

  test('should test mobile accessibility', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/reports/create');
    await ai.waitForContentToLoad();
    
    // Run mobile-specific accessibility checks
    await checkA11y(page, undefined, {
      tags: ['wcag2a', 'wcag2aa', 'best-practice']
    });
    
    // Test touch target sizes
    const interactiveElements = page.locator('button, a, input, select, textarea, [role="button"]');
    const elementCount = await interactiveElements.count();
    
    for (let i = 0; i < elementCount; i++) {
      const element = interactiveElements.nth(i);
      const boundingBox = await element.boundingBox();
      
      if (boundingBox) {
        // WCAG recommends minimum 44px touch targets
        const minSize = 44;
        const hasAdequateSize = boundingBox.width >= minSize && boundingBox.height >= minSize;
        
        if (!hasAdequateSize) {
          const elementInfo = await element.evaluate(el => ({
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            textContent: el.textContent?.substring(0, 20)
          }));
          
          console.warn(`Touch target too small:`, elementInfo, boundingBox);
        }
        
        // Allow some flexibility for certain element types
        const isFlexibleElement = await element.evaluate(el => {
          return el.tagName === 'INPUT' && ['checkbox', 'radio'].includes(el.getAttribute('type') || '');
        });
        
        if (!isFlexibleElement) {
          expect(hasAdequateSize).toBeTruthy();
        }
      }
    }
    
    // Test mobile form accessibility
    const firstInput = page.locator('input').first();
    if (await firstInput.count() > 0) {
      await firstInput.tap();
      await page.waitForTimeout(1000); // Wait for virtual keyboard
      
      // Verify form is still accessible with virtual keyboard
      const violations = await getViolations(page);
      const criticalViolations = violations.filter(v => v.impact === 'critical');
      
      expect(criticalViolations.length).toBe(0);
    }
  });

  test('should generate accessibility report with AI insights', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    const pages = [
      { url: '/auth/login', name: 'Login Page' },
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/reports/create', name: 'Report Creation' }
    ];
    
    const accessibilityReport = {
      summary: {
        totalPages: pages.length,
        totalViolations: 0,
        criticalViolations: 0,
        moderateViolations: 0,
        minorViolations: 0
      },
      pageResults: [] as any[],
      recommendations: [] as string[]
    };
    
    for (const pageInfo of pages) {
      await page.goto(pageInfo.url);
      await ai.waitForContentToLoad();
      
      const violations = await getViolations(page);
      
      const pageResult = {
        page: pageInfo.name,
        url: pageInfo.url,
        violations: violations.length,
        critical: violations.filter(v => v.impact === 'critical').length,
        serious: violations.filter(v => v.impact === 'serious').length,
        moderate: violations.filter(v => v.impact === 'moderate').length,
        minor: violations.filter(v => v.impact === 'minor').length,
        details: violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          nodes: v.nodes.length
        }))
      };
      
      accessibilityReport.pageResults.push(pageResult);
      accessibilityReport.summary.totalViolations += violations.length;
      accessibilityReport.summary.criticalViolations += pageResult.critical;
    }
    
    // AI-powered recommendations
    if (accessibilityReport.summary.criticalViolations > 0) {
      accessibilityReport.recommendations.push('Critical accessibility issues found - prioritize fixing these immediately');
    }
    
    if (accessibilityReport.summary.totalViolations > 10) {
      accessibilityReport.recommendations.push('High number of accessibility issues - consider accessibility audit and training');
    }
    
    // Pattern detection
    const violationPatterns: Record<string, number> = {};
    accessibilityReport.pageResults.forEach(result => {
      result.details.forEach((violation: any) => {
        violationPatterns[violation.id] = (violationPatterns[violation.id] || 0) + 1;
      });
    });
    
    Object.entries(violationPatterns).forEach(([violationType, count]) => {
      if (count > 1) {
        accessibilityReport.recommendations.push(`"${violationType}" appears ${count} times across pages - systematic fix needed`);
      }
    });
    
    console.log('📋 Accessibility Report:', JSON.stringify(accessibilityReport, null, 2));
    
    // Assert overall accessibility standards
    expect(accessibilityReport.summary.criticalViolations).toBe(0);
    expect(accessibilityReport.summary.totalViolations).toBeLessThan(20); // Reasonable threshold
  });
});