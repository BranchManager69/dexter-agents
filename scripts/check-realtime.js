const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required'
    ],
  });
  const context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage();

  const logs = [];
  page.on('console', (msg) => {
    logs.push({ type: msg.type(), text: msg.text() });
    console.log(`[console:${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    logs.push({ type: 'pageerror', text: err.message });
    console.error(`[pageerror] ${err.message}`);
  });
  page.on('request', async (request) => {
    if (request.url().includes('/v1/realtime/calls')) {
      const postData = request.postData();
      const headers = request.headers();
      console.log('Realtime call headers:', headers);
      console.log('Realtime call payload:', postData);
    }
  });
  page.on('response', async (response) => {
    if (response.status() >= 400) {
      const url = response.url();
      let body = '';
      try {
        body = await response.text();
      } catch (err) {
        body = `<unable to read body: ${err}>`;
      }
      console.error(`HTTP ${response.status()} ${url}\n${body.slice(0, 500)}`);
    }
  });

  await page.goto('https://beta.dexter.cash/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(15000);
  console.log('Captured logs:', JSON.stringify(logs, null, 2));
  await browser.close();
})();
