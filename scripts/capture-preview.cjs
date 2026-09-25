const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const cases = [
    ['320-home', 320, 568, 'home.html'],
    ['320-run', 320, 568, 'run.html'],
    ['375-home', 375, 740, 'home.html'],
    ['375-run', 375, 740, 'run.html']
  ];
  for (const [name, width, height, pageName] of cases) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:8765/output/ui-preview/${pageName}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      controls: [...document.querySelectorAll('button')].map((button) => {
        const box = button.getBoundingClientRect();
        return { label: button.textContent.trim(), width: box.width, height: box.height };
      })
    }));
    if (metrics.scrollWidth > width || metrics.scrollHeight > height) {
      throw new Error(`${name} overflows: ${JSON.stringify(metrics)}`);
    }
    if (metrics.controls.some((control) => control.height < 44)) {
      throw new Error(`${name} has a control below 44px: ${JSON.stringify(metrics)}`);
    }
    await page.screenshot({ path: path.resolve('.impeccable/review', `${name}.png`) });
    console.log(name, JSON.stringify(metrics));
    await page.close();
  }
  await browser.close();
})();
