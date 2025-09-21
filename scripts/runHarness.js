const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runHarness({
  prompt,
  targetUrl = 'https://beta.dexter.cash/',
  waitMs = 45000,
  outputDir = path.join(__dirname, '..', 'harness-results'),
  headless = true,
  saveArtifact = true,
  extraEnv = {},
} = {}) {
  if (!prompt || !prompt.trim()) {
    throw new Error('runHarness requires a non-empty prompt.');
  }

  const browser = await chromium.launch({
    headless,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  try {
    const context = await browser.newContext({ permissions: ['microphone'] });
    const page = await context.newPage();

    const consoleLogs = [];
    let lastActivity = Date.now();
    page.on('console', (msg) => {
      const entry = { type: msg.type(), text: msg.text() };
      consoleLogs.push(entry);
      // Surface to stdout in real time so the caller sees progress
      const prefix = `[console:${entry.type}]`;
      process.stdout.write(`${prefix} ${entry.text}\n`);
      lastActivity = Date.now();
    });
    page.on('pageerror', (err) => {
      const entry = { type: 'pageerror', text: err.message };
      consoleLogs.push(entry);
      process.stderr.write(`[pageerror] ${err.message}\n`);
      lastActivity = Date.now();
    });

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    const authGate = await page.evaluate(() => document.body && document.body.innerText);
    if (authGate && /401 Authorization Required/i.test(authGate)) {
      throw new Error(`Failed to load ${targetUrl}: received 401 Authorization Required.`);
    }

    const chatInput = await page.waitForSelector('input[placeholder="Type a message..."]', { timeout: 30000 });
    await chatInput.fill(prompt);
    await page.locator('button:has(img[alt="Send"])').click();

    const readTranscriptTexts = async () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('.whitespace-pre-wrap'))
          .map((el) => el.innerText.replace(/\s+/g, ' ').trim())
          .filter(Boolean),
      );

    let previousTexts = await readTranscriptTexts();
    let assistantCount = previousTexts.filter((text) => !text.startsWith('▶')).length;
    const quietWindowMs = 2000;
    const deadline = Date.now() + waitMs;
    const startTime = Date.now();

    while (Date.now() < deadline) {
      await page.waitForTimeout(300);
      const currentTexts = await readTranscriptTexts();
      const assistantTexts = currentTexts.filter((text) => !text.startsWith('▶'));
      const activity =
        currentTexts.length !== previousTexts.length ||
        currentTexts.some((text, index) => text !== previousTexts[index]);

      if (activity) {
        lastActivity = Date.now();
      }

      if (assistantTexts.length > assistantCount) {
        assistantCount = assistantTexts.length;
        lastActivity = Date.now();
      }

      previousTexts = currentTexts;

      if (assistantCount > 0 && Date.now() - lastActivity > quietWindowMs) {
        break;
      }
    }

    const waitElapsedMs = Date.now() - startTime;
    const timedOut = Date.now() >= deadline;

    const structuredState = await page.evaluate(() => {
      const cloneSerializable = (value) => {
        const seen = new WeakSet();
        return JSON.parse(
          JSON.stringify(
            value,
            (_key, val) => {
              if (typeof val === 'function') {
                return '[Function]';
              }
              if (typeof val === 'object' && val !== null) {
                if (seen.has(val)) {
                  return '[Circular]';
                }
                seen.add(val);
              }
              if (val instanceof Error) {
                return {
                  name: val.name,
                  message: val.message,
                  stack: val.stack,
                };
              }
              return val;
            },
          ),
        );
      };

      return {
        events: typeof window !== 'undefined'
          ? cloneSerializable(window.__DEXTER_EVENT_LOGS__ ?? [])
          : [],
        transcripts: typeof window !== 'undefined'
          ? cloneSerializable(window.__DEXTER_TRANSCRIPT_ITEMS__ ?? [])
          : [],
      };
    });

    const transcriptBubbles = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.whitespace-pre-wrap'))
        .map((el) => ({
          text: el.innerText,
          classes: el.className,
        }))
        .filter((item) => item.text && item.text.trim().length > 0),
    );

    const timestamp = new Date().toISOString();
    const artifact = {
      timestamp,
      prompt,
      url: targetUrl,
      waitMs,
      consoleLogs,
      transcriptBubbles,
      structured: structuredState,
      meta: {
        assistantMessageCount: assistantCount,
        waitElapsedMs,
        timedOut,
        consoleErrorCount: consoleLogs.filter((log) => log.type === 'error').length,
      },
    };

    let artifactPath = null;
    if (saveArtifact) {
      artifactPath = path.join(outputDir, `run-${timestamp.replace(/[:.]/g, '-')}.json`);
      fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
      fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), 'utf8');
      process.stdout.write(`Harness artifact written to ${artifactPath}\n`);
    }

    await browser.close();
    return { artifact, artifactPath };
  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }
}

module.exports = {
  runHarness,
};
