const path = require('path');
const {
  parseAuthorizationHeader,
  parseCookieHeader,
  resolveOutputDir,
  resolveMcpBearer,
  runUiHarness,
  runApiHarness,
  writeJsonSnapshot,
} = require('./harnessCommon');

const DEFAULT_WAIT_MS = 45000;

function parseArgs(argv, { supportsPageSize }) {
  const args = {
    prompt: null,
    url: null,
    wait: null,
    headful: false,
    artifact: true,
    json: false,
    mode: 'api',
    pageSize: null,
    output: null,
    guest: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--prompt' || arg === '-p') {
      args.prompt = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--url' || arg === '-u') {
      args.url = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--wait' || arg === '-w') {
      args.wait = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--headful') {
      args.headful = true;
      continue;
    }
    if (arg === '--no-artifact') {
      args.artifact = false;
      continue;
    }
    if (arg === '--json') {
      args.json = true;
      continue;
    }
    if (arg === '--output' || arg === '-o') {
      args.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--mode') {
      const next = (argv[i + 1] || '').toLowerCase();
      if (next === 'ui' || next === 'api' || next === 'both') {
        args.mode = next;
        i += 1;
      }
      continue;
    }
    if (supportsPageSize && arg === '--page-size') {
      args.pageSize = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--guest') {
      args.guest = true;
      continue;
    }
  }
  return args;
}

function resolvePrompt(cliPrompt, defaultPrompt) {
  if (cliPrompt && cliPrompt.trim()) return cliPrompt.trim();
  if (process.env.HARNESS_PROMPT && process.env.HARNESS_PROMPT.trim()) {
    return process.env.HARNESS_PROMPT.trim();
  }
  return defaultPrompt;
}

function resolveUrl(cliUrl, defaultUrl) {
  if (cliUrl && cliUrl.trim()) return cliUrl.trim();
  if (process.env.HARNESS_TARGET_URL && process.env.HARNESS_TARGET_URL.trim()) {
    return process.env.HARNESS_TARGET_URL.trim();
  }
  return defaultUrl;
}

function resolveWait(cliWait, defaultWaitMs = DEFAULT_WAIT_MS) {
  if (Number.isFinite(cliWait) && cliWait > 0) return cliWait;
  const envWait = Number(process.env.HARNESS_WAIT_MS);
  if (Number.isFinite(envWait) && envWait > 0) return envWait;
  return defaultWaitMs;
}

function resolvePageSize(cliSize, defaultPageSize) {
  if (Number.isFinite(cliSize) && cliSize > 0) return cliSize;
  const envSize = Number(process.env.HARNESS_PAGE_SIZE);
  if (Number.isFinite(envSize) && envSize > 0) return envSize;
  return defaultPageSize;
}

async function runToolHarness(toolConfig, argv) {
  if (!toolConfig) {
    throw new Error('Harness tool configuration not provided.');
  }
  const supportsPageSize = toolConfig?.options?.pageSize !== false;
  const args = parseArgs(argv, { supportsPageSize });
  const prompt = resolvePrompt(args.prompt, toolConfig.defaults?.prompt || '');
  const targetUrl = resolveUrl(args.url, toolConfig.defaults?.targetUrl || 'https://beta.dexter.cash/');
  const waitMs = resolveWait(args.wait, toolConfig.defaults?.waitMs);
  const pageSize = supportsPageSize ? resolvePageSize(args.pageSize, toolConfig.defaults?.pageSize ?? 5) : undefined;
  const guest = args.guest;

  const saveArtifactEnv = process.env.HARNESS_SAVE_ARTIFACT;
  const headlessEnv = process.env.HARNESS_HEADLESS;
  const headless = args.headful ? false : headlessEnv === 'false' ? false : true;
  const saveArtifact = args.artifact ? (saveArtifactEnv === 'false' ? false : true) : false;

  const outputDir = resolveOutputDir(args.output || process.env.HARNESS_OUTPUT_DIR);

  const hasCookie = guest ? false : !!parseCookieHeader();
  const hasBearer = guest ? false : !!parseAuthorizationHeader();
  const hasCreds = guest ? true : hasCookie || hasBearer;

  const results = [];

  if (args.mode === 'ui' || args.mode === 'both') {
    if (!hasCreds) {
      if (args.mode === 'ui') {
        console.error('HARNESS_COOKIE or HARNESS_AUTHORIZATION must be set for UI mode.');
        process.exit(1);
      } else {
        console.warn('HARNESS_COOKIE or HARNESS_AUTHORIZATION missing; skipping UI harness run.');
      }
    } else {
      process.stdout.write(`\n=== UI Harness (${toolConfig.id}) ===\n`);
      try {
        if (guest) {
          process.stdout.write('[guest] Running UI harness without stored auth.\n');
        }
        const artifact = await runUiHarness({ prompt, targetUrl, waitMs, headless, saveArtifact, outputDir, guest });
        results.push({ mode: 'ui', artifact });
        if (args.json) {
          process.stdout.write(`${JSON.stringify({ mode: 'ui', artifact }, null, 2)}\n`);
        }
      } catch (error) {
        console.error('UI harness run failed:', error?.message || error);
        results.push({ mode: 'ui', error: error?.message || String(error) });
        if (args.mode === 'ui') {
          process.exit(1);
        }
      }
    }
  }

  if (args.mode === 'api' || args.mode === 'both') {
    process.stdout.write(`\n=== API Harness (${toolConfig.id}) ===\n`);
    const bearerInfo = await resolveMcpBearer({ guest });
    if (!bearerInfo.bearer && process.env.HARNESS_DEBUG_SESSION === '1') {
      console.warn(`[${toolConfig.id}] MCP bearer not resolved via env or cookie; proceeding unauthenticated.`);
    }
    if (guest) {
      process.stdout.write('[guest] Running API harness without stored auth.\n');
    }

    const apiResult = await runApiHarness({
      guest,
      bearerOverride: bearerInfo.bearer,
      buildRequest: ({ session }) => {
        if (typeof toolConfig.api?.buildRequest !== 'function') {
          throw new Error(`Tool ${toolConfig.id} missing api.buildRequest implementation.`);
        }
        return toolConfig.api.buildRequest({
          session,
          options: { pageSize, args },
        });
      },
    });

    if (typeof toolConfig.api?.summarize === 'function') {
      const summary = toolConfig.api.summarize({ result: apiResult, options: { pageSize, args } });
      if (summary) {
        if (typeof summary === 'string') {
          process.stdout.write(`${summary}\n`);
        } else {
          process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
        }
      }
    }
    results.push({ mode: 'api', artifact: apiResult });
    if (args.json) {
      process.stdout.write(`${JSON.stringify({ mode: 'api', artifact: apiResult }, null, 2)}\n`);
    }
    if (saveArtifact) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = toolConfig.api?.artifactName
        ? toolConfig.api.artifactName({ timestamp, options: { pageSize, args } })
        : `${toolConfig.id}-api-${timestamp}.json`;
      const resolvedPath = path.isAbsolute(filename) ? filename : path.join(outputDir, filename);
      writeJsonSnapshot(resolvedPath, apiResult);
    }
  }

  return results;
}

module.exports = {
  runToolHarness,
};
