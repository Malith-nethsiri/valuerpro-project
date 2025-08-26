import { Eyes, Target, Configuration, BatchInfo, BrowserType, DeviceName, ScreenOrientation } from '@applitools/eyes-playwright';

/**
 * Applitools Eyes configuration for AI-powered visual testing
 */
export class ApplitoolsConfig {
  private eyes: Eyes;
  private config: Configuration;

  constructor() {
    this.eyes = new Eyes();
    this.config = new Configuration();
    this.setupConfiguration();
  }

  private setupConfiguration() {
    // Set API key from environment variable
    this.config.setApiKey(process.env.APPLITOOLS_API_KEY || 'demo-key');
    
    // Set app name and test suite
    this.config.setAppName('ValuerPro');
    this.config.setTestName('AI Visual Regression Suite');
    
    // Set batch information
    const batch = new BatchInfo('ValuerPro Visual Tests');
    batch.setSequenceName('Main Branch');
    this.config.setBatch(batch);
    
    // Configure browser combinations for cross-browser testing
    this.config.addBrowser(1200, 800, BrowserType.CHROME);
    this.config.addBrowser(1200, 800, BrowserType.FIREFOX);
    this.config.addBrowser(1200, 800, BrowserType.EDGE_CHROMIUM);
    this.config.addBrowser(1200, 800, BrowserType.SAFARI);
    
    // Mobile devices
    this.config.addDeviceEmulation(DeviceName.iPhone_X, ScreenOrientation.PORTRAIT);
    this.config.addDeviceEmulation(DeviceName.iPad_Pro, ScreenOrientation.LANDSCAPE);
    this.config.addDeviceEmulation(DeviceName.Pixel_2, ScreenOrientation.PORTRAIT);
    
    // Advanced AI features
    this.config.setMatchLevel('Strict'); // Use AI-powered strict matching
    this.config.setIgnoreDisplacements(true); // Ignore minor element movements
    this.config.setSaveDiffs(true); // Save diff images for analysis
    
    // Enable advanced features
    this.config.setUseDom(true); // Use DOM for better element matching
    this.config.setEnablePatterns(true); // Enable pattern matching
    this.config.setSendDom(true); // Send DOM structure for AI analysis
    
    // Performance optimization
    this.config.setConcurrentSessions(5); // Parallel test execution
    this.config.setWaitBeforeScreenshots(1000); // Wait for animations
    
    this.eyes.setConfiguration(this.config);
  }

  getEyes(): Eyes {
    return this.eyes;
  }

  /**
   * Create a smart checkpoint that adapts to content changes
   */
  createSmartCheckpoint(page: any, checkpointName: string, options: {
    ignoreRegions?: string[];
    floatingRegions?: Array<{selector: string, maxOffset: number}>;
    layoutRegions?: string[];
    strictRegions?: string[];
    contentRegions?: string[];
  } = {}) {
    const target = Target.window()
      .fully()
      .withName(checkpointName);

    // Apply ignore regions (elements that change frequently)
    if (options.ignoreRegions) {
      options.ignoreRegions.forEach(selector => {
        target.ignore(page.locator(selector));
      });
    }

    // Apply floating regions (elements that can move slightly)
    if (options.floatingRegions) {
      options.floatingRegions.forEach(region => {
        target.floating(page.locator(region.selector), region.maxOffset, region.maxOffset, region.maxOffset, region.maxOffset);
      });
    }

    // Apply layout regions (check layout but not exact content)
    if (options.layoutRegions) {
      options.layoutRegions.forEach(selector => {
        target.layout(page.locator(selector));
      });
    }

    // Apply strict regions (exact pixel matching)
    if (options.strictRegions) {
      options.strictRegions.forEach(selector => {
        target.strict(page.locator(selector));
      });
    }

    // Apply content regions (check content changes only)
    if (options.contentRegions) {
      options.contentRegions.forEach(selector => {
        target.content(page.locator(selector));
      });
    }

    return target;
  }

  /**
   * Predefined checkpoint configurations for common UI patterns
   */
  static getPresetConfigurations() {
    return {
      // Form pages with dynamic timestamps
      formPage: {
        ignoreRegions: [
          '[data-testid="timestamp"]',
          '.loading-spinner',
          '[data-dynamic="true"]'
        ],
        floatingRegions: [
          { selector: '.notification', maxOffset: 5 },
          { selector: '.tooltip', maxOffset: 10 }
        ],
        layoutRegions: [
          '.form-container',
          '.sidebar-navigation'
        ]
      },
      
      // Dashboard with live data
      dashboard: {
        ignoreRegions: [
          '.live-chart',
          '.current-time',
          '.notification-count'
        ],
        contentRegions: [
          '.summary-cards',
          '.report-list'
        ],
        layoutRegions: [
          '.dashboard-header',
          '.navigation-menu'
        ]
      },
      
      // Report wizard with step indicators
      wizard: {
        strictRegions: [
          '.step-indicator',
          '.progress-bar'
        ],
        layoutRegions: [
          '.wizard-content',
          '.wizard-navigation'
        ],
        floatingRegions: [
          { selector: '.validation-message', maxOffset: 5 }
        ]
      },

      // Mobile responsive layouts
      mobile: {
        ignoreRegions: [
          '.mobile-keyboard-space',
          '[data-mobile-dynamic="true"]'
        ],
        layoutRegions: [
          '.mobile-header',
          '.mobile-navigation',
          '.mobile-content'
        ]
      }
    };
  }

  /**
   * AI-powered test result analysis
   */
  static analyzeVisualTestResults(testResults: any[]) {
    const analysis = {
      totalTests: testResults.length,
      passed: 0,
      failed: 0,
      newBaselines: 0,
      patterns: [],
      recommendations: []
    };

    testResults.forEach(result => {
      if (result.getStatus() === 'Passed') {
        analysis.passed++;
      } else if (result.getStatus() === 'Failed') {
        analysis.failed++;
      } else if (result.getStatus() === 'New') {
        analysis.newBaselines++;
      }
    });

    // AI-like pattern detection
    if (analysis.failed > analysis.passed * 0.3) {
      analysis.recommendations.push('High failure rate detected - consider updating baselines or checking for major UI changes');
    }

    if (analysis.newBaselines > 0) {
      analysis.recommendations.push(`${analysis.newBaselines} new baselines created - review and approve if intentional`);
    }

    // Pattern analysis for common failure types
    const failurePatterns = testResults
      .filter(result => result.getStatus() === 'Failed')
      .map(result => result.getSteps())
      .flat()
      .filter(step => step.getResult().getStatus() === 'Failed')
      .map(step => step.getName());

    const patternCounts: Record<string, number> = {};
    failurePatterns.forEach(pattern => {
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    });

    Object.entries(patternCounts).forEach(([pattern, count]) => {
      if (count > 1) {
        analysis.patterns.push(`"${pattern}" failed ${count} times - check for systematic issue`);
      }
    });

    return analysis;
  }
}