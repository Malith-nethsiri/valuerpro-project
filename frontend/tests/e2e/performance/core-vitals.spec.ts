import { test, expect } from '@playwright/test';
import { createAITestHelpers } from '../utils/ai-test-helpers';

test.describe('Core Web Vitals and Performance @performance', () => {
  
  test('should meet Core Web Vitals thresholds on homepage', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Navigate and measure performance
    await page.goto('/');
    await ai.waitForContentToLoad();
    
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitalsData: any = {};
          
          entries.forEach((entry) => {
            // Largest Contentful Paint (LCP)
            if (entry.entryType === 'largest-contentful-paint') {
              vitalsData.lcp = entry.startTime;
            }
            // First Input Delay (FID) would be measured on actual user interaction
            // Cumulative Layout Shift (CLS)
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              vitalsData.cls = (vitalsData.cls || 0) + (entry as any).value;
            }
          });
          
          resolve(vitalsData);
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });
        
        // Fallback timeout
        setTimeout(() => resolve({}), 5000);
      });
    });
    
    console.log('🎯 Core Web Vitals:', vitals);
    
    // AI-powered performance analysis
    const performanceAnalysis = await ai.analyzePagePerformance();
    
    // Assertions based on Core Web Vitals thresholds
    if ((vitals as any).lcp) {
      expect((vitals as any).lcp).toBeLessThan(2500); // LCP should be < 2.5s
    }
    
    if ((vitals as any).cls !== undefined) {
      expect((vitals as any).cls).toBeLessThan(0.1); // CLS should be < 0.1
    }
    
    // Custom performance score should be good
    expect(performanceAnalysis.performanceScore).toBeGreaterThan(80);
    expect(performanceAnalysis.isLoadTimeFast).toBeTruthy();
    expect(performanceAnalysis.isFirstContentfulPaintFast).toBeTruthy();
  });

  test('should optimize resource loading with AI insights', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Monitor network requests
    const networkRequests: any[] = [];
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        resourceType: request.resourceType(),
        method: request.method()
      });
    });
    
    await page.goto('/reports/create');
    await ai.waitForContentToLoad();
    
    // Analyze resource loading patterns
    const analysis = {
      totalRequests: networkRequests.length,
      imageRequests: networkRequests.filter(r => r.resourceType === 'image').length,
      scriptRequests: networkRequests.filter(r => r.resourceType === 'script').length,
      stylesheetRequests: networkRequests.filter(r => r.resourceType === 'stylesheet').length,
      fontRequests: networkRequests.filter(r => r.resourceType === 'font').length,
      apiRequests: networkRequests.filter(r => r.resourceType === 'xhr' || r.resourceType === 'fetch').length
    };
    
    console.log('🔍 Resource Loading Analysis:', analysis);
    
    // AI-powered recommendations
    const recommendations = [];
    
    if (analysis.imageRequests > 20) {
      recommendations.push('Consider image optimization or lazy loading');
    }
    
    if (analysis.scriptRequests > 15) {
      recommendations.push('Consider script bundling or code splitting');
    }
    
    if (analysis.totalRequests > 100) {
      recommendations.push('High number of requests - consider resource consolidation');
    }
    
    if (recommendations.length > 0) {
      console.log('💡 AI Performance Recommendations:', recommendations);
    }
    
    // Performance expectations
    expect(analysis.totalRequests).toBeLessThan(150);
    expect(analysis.imageRequests).toBeLessThan(30);
    
    const performanceScore = await ai.analyzePagePerformance();
    expect(performanceScore.performanceScore).toBeGreaterThan(70);
  });

  test('should handle load testing simulation', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Simulate multiple concurrent operations
    const loadTestOperations = [
      () => page.goto('/'),
      () => page.goto('/reports'),
      () => page.goto('/reports/create'),
      () => page.goto('/dashboard')
    ];
    
    const startTime = Date.now();
    
    // Execute operations concurrently (simulating load)
    const results = await Promise.allSettled(
      loadTestOperations.map(async (operation, index) => {
        const operationStartTime = Date.now();
        await operation();
        await ai.waitForContentToLoad();
        return Date.now() - operationStartTime;
      })
    );
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('⚡ Load Test Results:', {
      totalTime,
      operationsCount: results.length,
      averageTime: totalTime / results.length,
      successfulOperations: results.filter(r => r.status === 'fulfilled').length,
      failedOperations: results.filter(r => r.status === 'rejected').length
    });
    
    // Expectations for load handling
    expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
    expect(results.filter(r => r.status === 'fulfilled').length).toBeGreaterThan(results.length * 0.8);
  });

  test('should maintain performance across different viewport sizes', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    const viewports = [
      { width: 320, height: 568, name: 'Mobile Small' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop Large' }
    ];
    
    const performanceResults: any[] = [];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/reports/create');
      await ai.waitForContentToLoad();
      
      const performance = await ai.analyzePagePerformance();
      performanceResults.push({
        viewport: viewport.name,
        ...performance
      });
      
      // Visual regression for each viewport
      await expect(page).toHaveScreenshot(`performance-${viewport.name.toLowerCase().replace(' ', '-')}.png`);
    }
    
    console.log('📱 Multi-Viewport Performance:', performanceResults);
    
    // All viewports should maintain good performance
    performanceResults.forEach(result => {
      expect(result.performanceScore).toBeGreaterThan(60);
      expect(result.isLoadTimeFast).toBeTruthy();
    });
    
    // Mobile performance might be slightly different but should still be acceptable
    const mobileResult = performanceResults.find(r => r.viewport === 'Mobile Small');
    const desktopResult = performanceResults.find(r => r.viewport === 'Desktop Large');
    
    if (mobileResult && desktopResult) {
      // Mobile shouldn't be more than 2x slower than desktop
      expect(mobileResult.loadTime / desktopResult.loadTime).toBeLessThan(2);
    }
  });

  test('should detect memory leaks and resource cleanup', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Navigate through multiple pages to check for memory leaks
    const navigationPath = [
      '/',
      '/dashboard',
      '/reports',
      '/reports/create',
      '/profile',
      '/dashboard' // Return to check cleanup
    ];
    
    const memorySnapshots: any[] = [];
    
    for (const path of navigationPath) {
      await page.goto(path);
      await ai.waitForContentToLoad();
      
      // Capture memory usage (simplified - real implementation would use Chrome DevTools)
      const memoryInfo = await page.evaluate(() => {
        return {
          // @ts-ignore
          usedHeapSize: (performance as any).memory?.usedHeapSize || 0,
          // @ts-ignore
          totalHeapSize: (performance as any).memory?.totalHeapSize || 0,
          // @ts-ignore
          heapSizeLimit: (performance as any).memory?.heapSizeLimit || 0,
          timestamp: Date.now()
        };
      });
      
      memorySnapshots.push({
        path,
        ...memoryInfo
      });
    }
    
    console.log('🧠 Memory Usage Analysis:', memorySnapshots);
    
    // Check for significant memory growth
    if (memorySnapshots.length > 1) {
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      
      if (firstSnapshot.usedHeapSize > 0 && lastSnapshot.usedHeapSize > 0) {
        const memoryGrowth = (lastSnapshot.usedHeapSize - firstSnapshot.usedHeapSize) / firstSnapshot.usedHeapSize;
        
        console.log(`📈 Memory growth: ${(memoryGrowth * 100).toFixed(2)}%`);
        
        // Memory shouldn't grow by more than 100% during normal navigation
        expect(memoryGrowth).toBeLessThan(1.0);
      }
    }
  });

  test('should validate bundle size and code splitting effectiveness', async ({ page }) => {
    const ai = createAITestHelpers(page);
    
    // Track JavaScript bundles loaded
    const jsResources: any[] = [];
    
    page.on('response', response => {
      if (response.request().resourceType() === 'script' && 
          response.url().includes('.js') && 
          response.status() === 200) {
        response.body().then(body => {
          jsResources.push({
            url: response.url(),
            size: body.length,
            cached: response.fromCache()
          });
        }).catch(() => {});
      }
    });
    
    await page.goto('/');
    await ai.waitForContentToLoad();
    
    // Navigate to different sections to trigger code splitting
    await page.goto('/reports/create');
    await ai.waitForContentToLoad();
    
    // Wait a bit for all resources to load
    await page.waitForTimeout(2000);
    
    const bundleAnalysis = {
      totalBundles: jsResources.length,
      totalSize: jsResources.reduce((sum, resource) => sum + resource.size, 0),
      cachedBundles: jsResources.filter(r => r.cached).length,
      averageBundleSize: jsResources.length > 0 ? jsResources.reduce((sum, r) => sum + r.size, 0) / jsResources.length : 0,
      largestBundle: jsResources.reduce((max, r) => r.size > max.size ? r : max, { size: 0 })
    };
    
    console.log('📦 Bundle Analysis:', bundleAnalysis);
    
    // Bundle size expectations
    expect(bundleAnalysis.totalSize).toBeLessThan(2 * 1024 * 1024); // < 2MB total
    expect(bundleAnalysis.largestBundle.size).toBeLessThan(500 * 1024); // < 500KB per bundle
    
    // Code splitting effectiveness - should have multiple smaller bundles
    if (bundleAnalysis.totalBundles > 3) {
      expect(bundleAnalysis.averageBundleSize).toBeLessThan(300 * 1024); // < 300KB average
    }
  });
});