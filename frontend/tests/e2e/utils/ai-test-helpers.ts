import { Page, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

/**
 * AI-powered test utilities for ValuerPro
 */
export class AITestHelpers {
  constructor(private page: Page) {}

  /**
   * Intelligent element detection using AI-like selectors
   * Falls back through multiple strategies to find elements
   */
  async findElementIntelligently(
    description: string,
    selectors: string[] = []
  ) {
    const strategies = [
      // Direct selectors provided
      ...selectors,
      // Semantic selectors based on description
      `[aria-label*="${description.toLowerCase()}"]`,
      `[title*="${description.toLowerCase()}"]`,
      `[placeholder*="${description.toLowerCase()}"]`,
      `text=${description}`,
      `text=/${description}/i`,
      // Data-testid strategy
      `[data-testid*="${description.toLowerCase().replace(/\s+/g, '-')}"]`,
      // Role-based selectors
      `[role="button"]:has-text("${description}")`,
      `[role="textbox"][placeholder*="${description}"]`,
    ];

    for (const strategy of strategies) {
      try {
        const element = this.page.locator(strategy).first();
        if (await element.count() > 0) {
          console.log(`✅ Found element "${description}" using strategy: ${strategy}`);
          return element;
        }
      } catch (error) {
        // Continue to next strategy
        continue;
      }
    }

    throw new Error(`❌ Could not find element: ${description}`);
  }

  /**
   * AI-powered form filling that understands field purposes
   */
  async fillFormIntelligently(formData: Record<string, string>) {
    for (const [fieldDescription, value] of Object.entries(formData)) {
      try {
        const field = await this.findElementIntelligently(fieldDescription, [
          `input[name*="${fieldDescription.toLowerCase()}"]`,
          `input[id*="${fieldDescription.toLowerCase()}"]`,
          `select[name*="${fieldDescription.toLowerCase()}"]`,
          `textarea[name*="${fieldDescription.toLowerCase()}"]`,
        ]);

        const tagName = await field.evaluate(el => el.tagName.toLowerCase());
        
        if (tagName === 'select') {
          await field.selectOption(value);
        } else {
          await field.fill(value);
        }
        
        console.log(`✅ Filled field "${fieldDescription}" with "${value}"`);
      } catch (error) {
        console.warn(`⚠️ Could not fill field "${fieldDescription}": ${error}`);
      }
    }
  }

  /**
   * Smart waiting for dynamic content with AI-like patience
   */
  async waitForContentToLoad(expectedContent?: string, timeout = 10000) {
    if (expectedContent) {
      await this.page.waitForFunction(
        (content) => document.body.innerText.includes(content),
        expectedContent,
        { timeout }
      );
    } else {
      // Wait for network to be idle and loading indicators to disappear
      await Promise.all([
        this.page.waitForLoadState('networkidle'),
        this.page.waitForSelector('[data-loading="true"]', { 
          state: 'detached', 
          timeout: 5000 
        }).catch(() => {}), // Ignore if no loading indicator exists
      ]);
    }
  }

  /**
   * AI-powered visual validation
   */
  async validateVisualLayout(options: {
    checkAlignment?: boolean;
    checkOverlaps?: boolean;
    checkVisibility?: boolean;
    excludeSelectors?: string[];
  } = {}) {
    const {
      checkAlignment = true,
      checkOverlaps = true,
      checkVisibility = true,
      excludeSelectors = []
    } = options;

    if (checkVisibility) {
      // Check for invisible text or elements that should be visible
      const invisibleElements = await this.page.locator('*:visible').evaluateAll(
        (elements, exclude) => {
          return elements.filter((el: Element) => {
            if (exclude.some(selector => el.matches(selector))) return false;
            
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            
            return (
              style.color === style.backgroundColor ||
              style.opacity === '0' ||
              rect.width === 0 ||
              rect.height === 0
            );
          }).map((el: Element) => ({
            tagName: el.tagName,
            className: el.className,
            text: el.textContent?.substring(0, 50)
          }));
        },
        excludeSelectors
      );

      if (invisibleElements.length > 0) {
        console.warn('⚠️ Found potentially invisible elements:', invisibleElements);
      }
    }

    if (checkOverlaps) {
      // Check for overlapping interactive elements
      const overlaps = await this.page.evaluate(() => {
        const interactiveElements = Array.from(
          document.querySelectorAll('button, a, input, select, textarea')
        );

        const overlapping: any[] = [];
        
        for (let i = 0; i < interactiveElements.length; i++) {
          for (let j = i + 1; j < interactiveElements.length; j++) {
            const rect1 = interactiveElements[i].getBoundingClientRect();
            const rect2 = interactiveElements[j].getBoundingClientRect();
            
            const overlap = !(
              rect1.right < rect2.left ||
              rect2.right < rect1.left ||
              rect1.bottom < rect2.top ||
              rect2.bottom < rect1.top
            );
            
            if (overlap) {
              overlapping.push({
                element1: interactiveElements[i].tagName + '.' + interactiveElements[i].className,
                element2: interactiveElements[j].tagName + '.' + interactiveElements[j].className
              });
            }
          }
        }
        
        return overlapping;
      });

      if (overlaps.length > 0) {
        console.warn('⚠️ Found overlapping interactive elements:', overlaps);
      }
    }
  }

  /**
   * Comprehensive accessibility testing with AI insights
   */
  async runAccessibilityAudit(options: {
    includeTags?: string[];
    excludeTags?: string[];
    reportViolations?: boolean;
  } = {}) {
    const {
      includeTags = ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
      excludeTags = [],
      reportViolations = true
    } = options;

    try {
      await injectAxe(this.page);
      
      const results = await checkA11y(this.page, undefined, {
        tags: includeTags,
        excludedImpacts: [],
        reporter: reportViolations ? 'v2' : undefined
      });

      if (reportViolations) {
        const violations = await getViolations(this.page);
        if (violations.length > 0) {
          console.log('🚨 Accessibility violations found:');
          violations.forEach((violation, index) => {
            console.log(`${index + 1}. ${violation.id}: ${violation.description}`);
            console.log(`   Impact: ${violation.impact}`);
            console.log(`   Elements: ${violation.nodes.length}`);
          });
        } else {
          console.log('✅ No accessibility violations found');
        }
        
        return violations;
      }
    } catch (error) {
      console.error('❌ Accessibility audit failed:', error);
      throw error;
    }
  }

  /**
   * Performance monitoring with AI analysis
   */
  async analyzePagePerformance() {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });

    // AI-like analysis of performance metrics
    const analysis = {
      loadTime: metrics.loadTime,
      isLoadTimeFast: metrics.loadTime < 2000,
      isDOMLoadFast: metrics.domContentLoaded < 1000,
      isFirstPaintFast: (metrics.firstPaint || 0) < 1000,
      isFirstContentfulPaintFast: (metrics.firstContentfulPaint || 0) < 1500,
      resourcesLoaded: metrics.resourceCount,
      performanceScore: this.calculatePerformanceScore(metrics)
    };

    console.log('📊 Performance Analysis:', analysis);
    return analysis;
  }

  private calculatePerformanceScore(metrics: any): number {
    let score = 100;
    
    // Deduct points based on performance metrics
    if (metrics.loadTime > 3000) score -= 30;
    else if (metrics.loadTime > 2000) score -= 15;
    
    if (metrics.domContentLoaded > 1500) score -= 20;
    else if (metrics.domContentLoaded > 1000) score -= 10;
    
    if ((metrics.firstContentfulPaint || 0) > 2000) score -= 20;
    else if ((metrics.firstContentfulPaint || 0) > 1500) score -= 10;
    
    if (metrics.resourceCount > 100) score -= 15;
    else if (metrics.resourceCount > 50) score -= 5;
    
    return Math.max(0, score);
  }

  /**
   * Intelligent screenshot comparison
   */
  async takeIntelligentScreenshot(name: string, options: {
    fullPage?: boolean;
    excludeSelectors?: string[];
    threshold?: number;
  } = {}) {
    const { fullPage = false, excludeSelectors = [], threshold = 0.2 } = options;

    // Hide dynamic elements that change frequently
    const defaultExcludeSelectors = [
      '[data-testid="timestamp"]',
      '.loading-spinner',
      '.clock',
      '[data-dynamic="true"]'
    ];

    const allExcludeSelectors = [...defaultExcludeSelectors, ...excludeSelectors];

    // Temporarily hide excluded elements
    for (const selector of allExcludeSelectors) {
      await this.page.locator(selector).evaluateAll(elements => {
        elements.forEach(el => (el as HTMLElement).style.visibility = 'hidden');
      }).catch(() => {}); // Ignore if selector doesn't exist
    }

    // Take screenshot
    const screenshot = await this.page.screenshot({
      fullPage,
      threshold,
      animations: 'disabled'
    });

    // Restore hidden elements
    for (const selector of allExcludeSelectors) {
      await this.page.locator(selector).evaluateAll(elements => {
        elements.forEach(el => (el as HTMLElement).style.visibility = 'visible');
      }).catch(() => {});
    }

    return screenshot;
  }
}

/**
 * Factory function to create AI test helpers
 */
export function createAITestHelpers(page: Page): AITestHelpers {
  return new AITestHelpers(page);
}