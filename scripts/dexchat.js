#!/usr/bin/env node
const path = require('path');
const { spawn } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { runHarness, resolveOutputDir } = require('./runHarness');

async function runRefreshCommand(argv) {
  const pythonBin = process.env.DEXCHAT_PYTHON || 'python3';
  const scriptPath = path.join(__dirname, 'update_harness_cookie.py');
  const refreshArgs = [scriptPath, '--refresh-storage'];

  const customPrompt = typeof argv.prompt === 'string' && argv.prompt.trim()
    ? argv.prompt.trim()
    : null;
  if (customPrompt) {
    refreshArgs.push('--prompt', customPrompt);
  }

  if (argv.stdin) {
    refreshArgs.push('--stdin');
  }

  const cookieValue = typeof argv.cookie === 'string' && argv.cookie.trim()
    ? argv.cookie.trim()
    : null;
  if (cookieValue) {
    refreshArgs.push('--value', cookieValue);
  }

  await new Promise((resolve, reject) => {
    const child = spawn(pythonBin, refreshArgs, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`update_harness_cookie.py exited with code ${code}`));
      }
    });
  });
}

(async () => {
  const argv = yargs(hideBin(process.argv))
    .usage('$0 [options]', 'Run a scripted chat against the Dexter realtime agent.', (cmd) =>
      cmd
        .option('prompt', {
          alias: 'p',
          type: 'string',
          describe: 'Message to send to the agent.',
        })
        .option('url', {
          alias: 'u',
          type: 'string',
          describe: 'Target URL to load before running the conversation.',
        })
        .option('wait', {
          alias: 'w',
          type: 'number',
          describe: 'Time to wait (ms) after sending the prompt before snapshotting results.',
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          describe: 'Directory where run artifacts will be stored.',
        })
        .option('artifact', {
          type: 'boolean',
          describe: 'Write JSON artifact to disk (disable with --no-artifact).',
        })
        .option('headful', {
          type: 'boolean',
          describe: 'Run Playwright in headed mode (visible browser).',
        })
        .option('json', {
          type: 'boolean',
          describe: 'Print the artifact JSON to stdout when the run completes.',
        })
        .option('storage', {
          type: 'string',
          describe: 'Write Playwright storage state to the provided path.',
        })
        .option('storage-state', {
          type: 'string',
          describe: 'Load Playwright storage state before running.',
        })
        .option('guest', {
          type: 'boolean',
          describe: 'Ignore stored auth and run as a guest.',
        })
        .option('cookie', {
          type: 'string',
          describe: 'URL-encoded HARNESS_COOKIE (for the refresh command).',
        })
        .option('stdin', {
          type: 'boolean',
          describe: 'Read HARNESS_COOKIE from STDIN (for the refresh command).',
        })
        .example('$0 --prompt "Check my wallet"', 'Run against beta with default settings.')
        .example('$0 -p "Test" -u http://localhost:3000/ -w 30000', 'Run against local dev for 30 seconds.')
        .example('$0 refresh', 'Interactively refresh HARNESS_COOKIE + storage state.')
        .help()
        .alias('help', 'h'),
    ).argv;

  try {
    const subcommand = Array.isArray(argv._) && argv._.length > 0 ? argv._[0] : null;
    if (subcommand === 'refresh') {
      await runRefreshCommand(argv);
      return;
    }

    const promptFromEnv = typeof process.env.HARNESS_PROMPT === 'string'
      ? process.env.HARNESS_PROMPT.trim()
      : '';
    const prompt = typeof argv.prompt === 'string' && argv.prompt.trim()
      ? argv.prompt.trim()
      : promptFromEnv;
    if (!prompt) {
      throw new Error('Prompt is required (pass --prompt or set HARNESS_PROMPT).');
    }

    const envUrl = typeof process.env.HARNESS_TARGET_URL === 'string'
      ? process.env.HARNESS_TARGET_URL.trim()
      : '';
    const targetUrl = typeof argv.url === 'string' && argv.url.trim()
      ? argv.url.trim()
      : envUrl || 'https://beta.dexter.cash/';

    const waitCandidates = [argv.wait, Number(process.env.HARNESS_WAIT_MS)];
    const waitMs = waitCandidates.find((value) => Number.isFinite(value) && value > 0) || 45000;

    const rawOutputDir = typeof argv.output === 'string' && argv.output.trim()
      ? argv.output.trim()
      : (typeof process.env.HARNESS_OUTPUT_DIR === 'string' ? process.env.HARNESS_OUTPUT_DIR.trim() : undefined);
    const outputDir = resolveOutputDir(rawOutputDir);

    const headless = argv.headful
      ? false
      : process.env.HARNESS_HEADLESS === 'false'
        ? false
        : true;

    const artifactFlag = argv.artifact === undefined ? true : argv.artifact;
    const saveArtifact = artifactFlag && process.env.HARNESS_SAVE_ARTIFACT !== 'false';

    const storageStatePath = typeof argv.storage === 'string' && argv.storage.trim()
      ? argv.storage.trim()
      : undefined;

    let storageStateToLoad = typeof argv.storageState === 'string' && argv.storageState.trim()
      ? argv.storageState.trim()
      : (typeof process.env.HARNESS_STORAGE_STATE === 'string'
          ? process.env.HARNESS_STORAGE_STATE.trim()
          : '') || undefined;

    if (argv.guest) {
      storageStateToLoad = undefined;
      process.stdout.write('Guest mode enabled – skipping stored authentication.\n');
    }

    const jsonOutput = argv.json || process.env.HARNESS_JSON === '1';

    const { artifact, artifactPath } = await runHarness({
      prompt,
      targetUrl,
      waitMs,
      outputDir,
      headless,
      saveArtifact,
      storageState: storageStateToLoad,
      storageStatePath,
    });

    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
    }

    if (artifactPath) {
      process.stdout.write(`Saved artifact: ${artifactPath}\n`);
    } else if (saveArtifact) {
      process.stdout.write('Run completed, but no artifact was written.\n');
    }
  } catch (error) {
    console.error('dexchat failed:', error.message || error);
    process.exitCode = 1;
  }
})();
