const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Test desktop view
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto('file://' + process.cwd() + '/index.html');
  
  // Scroll to trust indicators
  await page.evaluate(() => {
    document.getElementById('trust').scrollIntoView({ behavior: 'smooth' });
  });
  await page.waitForTimeout(1000);
  
  // Get trust indicator card dimensions
  const trustCard = await page.evaluate(() => {
    const card = document.querySelector('.trust-item');
    const styles = window.getComputedStyle(card);
    return {
      padding: styles.padding,
      boxShadow: styles.boxShadow,
      borderRadius: styles.borderRadius,
      position: styles.position
    };
  });
  
  // Scroll to process section
  await page.evaluate(() => {
    document.getElementById('process').scrollIntoView({ behavior: 'smooth' });
  });
  await page.waitForTimeout(1000);
  
  // Get process card dimensions
  const processCard = await page.evaluate(() => {
    const card = document.querySelector('.process-step');
    const styles = window.getComputedStyle(card);
    return {
      padding: styles.padding,
      boxShadow: styles.boxShadow,
      borderRadius: styles.borderRadius,
      position: styles.position
    };
  });
  
  console.log('Trust Indicator Card:', trustCard);
  console.log('Process Card:', processCard);
  console.log('\nComparison:');
  console.log('Padding match:', trustCard.padding === processCard.padding);
  console.log('Box shadow match:', trustCard.boxShadow === processCard.boxShadow);
  console.log('Border radius match:', trustCard.borderRadius === processCard.borderRadius);
  console.log('Position match:', trustCard.position === processCard.position);
  
  await page.waitForTimeout(3000);
  await browser.close();
})();