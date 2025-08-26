import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');
  
  // Create a browser instance to verify the application is running
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the application to be available
    console.log('⏳ Waiting for application to be ready...');
    await page.goto('http://localhost:3002', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    console.log('✅ Application is ready for testing');
    
    // Create a test user session if needed
    // This could include login, seeding test data, etc.
    
  } catch (error) {
    console.error('❌ Failed to set up tests:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global setup completed');
}

export default globalSetup;