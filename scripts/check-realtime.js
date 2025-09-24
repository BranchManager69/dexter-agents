#!/usr/bin/env node
const path = require('path');
const { runHarness, resolveOutputDir } = require('./runHarness');

(async () => {
  try {
    const argPrompt = process.argv[2];
    const prompt = argPrompt || process.env.HARNESS_PROMPT || 'Hello from dexchat';
    const targetUrl = process.env.HARNESS_TARGET_URL || 'https://beta.dexter.cash/';
    const waitMs = Number(process.env.HARNESS_WAIT_MS || '45000');
    const outputDir = resolveOutputDir(process.env.HARNESS_OUTPUT_DIR);
    const storageState = process.env.HARNESS_STORAGE_STATE
      ? process.env.HARNESS_STORAGE_STATE.trim()
      : undefined;
    const { artifactPath } = await runHarness({
      prompt,
      targetUrl,
      waitMs,
      outputDir,
      headless: process.env.HARNESS_HEADLESS !== 'false',
      saveArtifact: process.env.HARNESS_SAVE_ARTIFACT !== 'false',
      storageState,
    });

    if (!artifactPath) {
      process.stdout.write('Harness completed without writing an artifact (HARNESS_SAVE_ARTIFACT=false).\n');
    }
  } catch (error) {
    console.error('Harness run failed:', error.message || error);
    process.exitCode = 1;
  }
})();
