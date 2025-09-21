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

  await page.goto('https://beta.dexter.cash/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button:has-text("Disconnect")', { timeout: 60000 });

  // The chat input is currently an <input placeholder="Type a message...">.
  const chatInput = await page.waitForSelector('input[placeholder="Type a message..."]', { timeout: 30000 });
  await chatInput.fill('What wallet am I currently using?');
  await page.locator('button:has(img[alt="Send"])').click();

  await page.waitForTimeout(40000);

  const transcriptBubbles = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.whitespace-pre-wrap'))
      .map((el) => ({
        text: el.innerText,
        classes: el.className,
      }))
      .filter((item) => item.text && item.text.trim().length > 0),
  );

  console.log('Captured logs:', JSON.stringify(logs, null, 2));
  console.log('Transcript bubbles:', JSON.stringify(transcriptBubbles, null, 2));
  await browser.close();
})();
