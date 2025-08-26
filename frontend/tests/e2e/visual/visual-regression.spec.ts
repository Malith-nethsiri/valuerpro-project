import { test, expect } from '@playwright/test';
import { ApplitoolsConfig } from './applitools-config';
import { createAITestHelpers } from '../utils/ai-test-helpers';

test.describe('AI-Powered Visual Regression Testing @visual', () => {
  let applitoolsConfig: ApplitoolsConfig;
  let eyes: any;

  test.beforeAll(async () => {
    applitoolsConfig = new ApplitoolsConfig();
    eyes = applitoolsConfig.getEyes();
  });

  test.afterAll(async () => {
    if (eyes) {
      await eyes.closeAsync();
    }
  });

  test('should capture login page visual baseline', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Open Eyes session
    await eyes.open(page, 'ValuerPro', 'Login Page Visual Test');
    
    // Navigate and wait for content
    await page.goto('/auth/login');
    await ai.waitForContentToLoad('Sign in to your account');
    
    // Create smart checkpoint with form-specific configuration
    const checkpoint = applitoolsConfig.createSmartCheckpoint(page, 'Login Form', 
      ApplitoolsConfig.getPresetConfigurations().formPage
    );
    
    await eyes.check(checkpoint);
    
    // Test with error state
    await ai.fillFormIntelligently({
      'email': 'invalid-email',
      'password': 'test'
    });
    
    const loginButton = await ai.findElementIntelligently('sign in');
    await loginButton.click();
    
    // Wait for validation errors
    await page.waitForTimeout(1000);
    
    // Capture error state
    const errorCheckpoint = applitoolsConfig.createSmartCheckpoint(page, 'Login Form - Error State', {
      strictRegions: ['.error-message', '[aria-invalid="true"]'],
      ignoreRegions: ['[data-testid="timestamp"]']
    });
    
    await eyes.check(errorCheckpoint);
  });

  test('should validate report creation wizard visual consistency', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    await eyes.open(page, 'ValuerPro', 'Report Wizard Visual Test');
    
    // Navigate to wizard
    await page.goto('/reports/create');
    await ai.waitForContentToLoad('Report Info');
    
    // Capture each wizard step
    const wizardSteps = [
      'Report Info',
      'Identification & Title', 
      'Location & Access',
      'Site Description',
      'Buildings',
      'Utilities',
      'Planning/Zoning',
      'Locality',
      'Valuation',
      'Disclaimers',
      'Appendices',
      'Review & Generate'
    ];
    
    for (let i = 0; i < wizardSteps.length; i++) {
      const stepName = wizardSteps[i];
      
      // Create checkpoint for current step
      const checkpoint = applitoolsConfig.createSmartCheckpoint(
        page, 
        `Wizard Step ${i + 1} - ${stepName}`,
        ApplitoolsConfig.getPresetConfigurations().wizard
      );
      
      await eyes.check(checkpoint);
      
      // Fill minimal data and move to next step (except last step)
      if (i < wizardSteps.length - 1) {
        // Fill required fields based on step
        switch (stepName) {
          case 'Report Info':
            await ai.fillFormIntelligently({
              'purpose': 'Sale/Purchase',
              'inspection date': '2024-11-30'
            });
            break;
          case 'Identification & Title':
            await ai.fillFormIntelligently({
              'lot number': 'TEST123',
              'plan number': 'PLAN123'
            });
            break;
          case 'Location & Access':
            await ai.fillFormIntelligently({
              'district': 'Colombo',
              'province': 'Western'
            });
            break;
        }
        
        // Move to next step
        const nextButton = await ai.findElementIntelligently('next');
        await nextButton.click();
        await ai.waitForContentToLoad();
      }
    }
  });

  test('should test responsive design across devices', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    await eyes.open(page, 'ValuerPro', 'Responsive Design Test');
    
    const pages = [
      { url: '/', name: 'Homepage' },
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/reports/create', name: 'Report Creation' }
    ];
    
    const viewports = [
      { width: 320, height: 568, name: 'Mobile Small' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1440, height: 900, name: 'Desktop' },
      { width: 1920, height: 1080, name: 'Desktop Large' }
    ];
    
    for (const pageInfo of pages) {
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(pageInfo.url);
        await ai.waitForContentToLoad();
        
        // Use mobile-specific configuration for mobile viewports
        const config = viewport.width < 768 ? 
          ApplitoolsConfig.getPresetConfigurations().mobile :
          ApplitoolsConfig.getPresetConfigurations().dashboard;
        
        const checkpoint = applitoolsConfig.createSmartCheckpoint(
          page,
          `${pageInfo.name} - ${viewport.name}`,
          config
        );
        
        await eyes.check(checkpoint);
      }
    }
  });

  test('should detect subtle UI changes with AI precision', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    await eyes.open(page, 'ValuerPro', 'Subtle Changes Detection');
    
    // Test form field styling consistency
    await page.goto('/reports/create');
    await ai.waitForContentToLoad();
    
    // Capture baseline
    const baselineCheckpoint = applitoolsConfig.createSmartCheckpoint(
      page,
      'Form Field Styles - Baseline',
      {
        strictRegions: [
          'input[type="text"]',
          'input[type="email"]',
          'select',
          'textarea',
          'button'
        ]
      }
    );
    
    await eyes.check(baselineCheckpoint);
    
    // Test focus states
    const firstInput = page.locator('input').first();
    await firstInput.focus();
    await page.waitForTimeout(500);
    
    const focusCheckpoint = applitoolsConfig.createSmartCheckpoint(
      page,
      'Form Field Focus State',
      {
        strictRegions: ['input:focus', 'input:focus + label'],
        ignoreRegions: ['input:not(:focus)']
      }
    );
    
    await eyes.check(focusCheckpoint);
    
    // Test hover states
    const submitButton = await ai.findElementIntelligently('next');
    await submitButton.hover();
    await page.waitForTimeout(300);
    
    const hoverCheckpoint = applitoolsConfig.createSmartCheckpoint(
      page,
      'Button Hover State',
      {
        strictRegions: ['button:hover'],
        ignoreRegions: ['button:not(:hover)']
      }
    );
    
    await eyes.check(hoverCheckpoint);
  });

  test('should validate data visualization consistency', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    await eyes.open(page, 'ValuerPro', 'Data Visualization Test');
    
    // Navigate to dashboard or reports with charts
    await page.goto('/dashboard');
    await ai.waitForContentToLoad();
    
    // Wait for any charts or data visualizations to load
    await page.waitForTimeout(3000);
    
    // Capture charts with content-based matching (ignore exact data, focus on structure)
    const chartCheckpoint = applitoolsConfig.createSmartCheckpoint(
      page,
      'Dashboard Charts',
      {
        contentRegions: ['.chart-container', '[data-testid*="chart"]'],
        layoutRegions: ['.dashboard-grid', '.chart-legend'],
        ignoreRegions: ['.chart-tooltip', '.live-data-point']
      }
    );
    
    await eyes.check(chartCheckpoint);
    
    // Test different chart states if interactive
    const chartElements = page.locator('.chart-container, [data-testid*="chart"]');
    const chartCount = await chartElements.count();
    
    if (chartCount > 0) {
      // Hover over first chart element
      await chartElements.first().hover();
      await page.waitForTimeout(500);
      
      const interactiveChartCheckpoint = applitoolsConfig.createSmartCheckpoint(
        page,
        'Interactive Chart State',
        {
          layoutRegions: ['.chart-container'],
          floatingRegions: [{ selector: '.chart-tooltip', maxOffset: 10 }]
        }
      );
      
      await eyes.check(interactiveChartCheckpoint);
    }
  });

  test('should test dark mode visual consistency', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    await eyes.open(page, 'ValuerPro', 'Dark Mode Test');
    
    // Toggle to dark mode if supported
    await page.goto('/dashboard');
    await ai.waitForContentToLoad();
    
    // Look for dark mode toggle
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"], .theme-toggle, [aria-label*="dark"]').first();
    
    if (await darkModeToggle.count() > 0) {
      // Capture light mode first
      const lightModeCheckpoint = applitoolsConfig.createSmartCheckpoint(
        page,
        'Dashboard Light Mode',
        ApplitoolsConfig.getPresetConfigurations().dashboard
      );
      
      await eyes.check(lightModeCheckpoint);
      
      // Switch to dark mode
      await darkModeToggle.click();
      await page.waitForTimeout(1000); // Wait for theme transition
      
      // Capture dark mode
      const darkModeCheckpoint = applitoolsConfig.createSmartCheckpoint(
        page,
        'Dashboard Dark Mode',
        ApplitoolsConfig.getPresetConfigurations().dashboard
      );
      
      await eyes.check(darkModeCheckpoint);
    } else {
      console.log('Dark mode toggle not found - skipping dark mode test');
    }
  });

  test('should validate accessibility visual indicators', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    await eyes.open(page, 'ValuerPro', 'Accessibility Visual Test');
    
    await page.goto('/auth/login');
    await ai.waitForContentToLoad();
    
    // Test keyboard navigation visual feedback
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);
    
    const keyboardFocusCheckpoint = applitoolsConfig.createSmartCheckpoint(
      page,
      'Keyboard Focus Indicators',
      {
        strictRegions: [':focus', '[data-focus="true"]'],
        ignoreRegions: [':not(:focus)']
      }
    );
    
    await eyes.check(keyboardFocusCheckpoint);
    
    // Test high contrast mode if supported
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.waitForTimeout(500);
    
    const highContrastCheckpoint = applitoolsConfig.createSmartCheckpoint(
      page,
      'High Contrast Mode',
      {
        strictRegions: ['input', 'button', 'a', 'label']
      }
    );
    
    await eyes.check(highContrastCheckpoint);
  });
});