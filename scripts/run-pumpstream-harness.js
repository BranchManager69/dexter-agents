#!/usr/bin/env node
// Dual-mode harness helper: UI (Playwright) + API (direct MCP) to validate pumpstream pagination.

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { runHarness, resolveOutputDir } = require('./runHarness');

let mcpModulesPromise;
async function loadMcpModules() {
  if (!mcpModulesPromise) {
    mcpModulesPromise = Promise.all([
      import('@modelcontextprotocol/sdk/client/index.js'),
      import('@modelcontextprotocol/sdk/client/streamableHttp.js'),
    ]).then(([clientMod, transportMod]) => ({
      McpClient: clientMod.Client,
      StreamableHTTPClientTransport: transportMod.StreamableHTTPClientTransport,
    }));
  }
  return mcpModulesPromise;
}

// Auto-load repo .env so HARNESS_* values can be defined once.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
function parseArgs(argv) {
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
    if (arg === '--page-size') {
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

function resolvePrompt(cliPrompt) {
  if (cliPrompt && cliPrompt.trim()) return cliPrompt.trim();
  if (process.env.HARNESS_PROMPT && process.env.HARNESS_PROMPT.trim()) {
    return process.env.HARNESS_PROMPT.trim();
  }
  return 'Give me the latest pumpstream summary. Use page size 5 and fetch the next page if more streams are available.';
}

function resolveUrl(cliUrl) {
  if (cliUrl && cliUrl.trim()) return cliUrl.trim();
  if (process.env.HARNESS_TARGET_URL && process.env.HARNESS_TARGET_URL.trim()) {
    return process.env.HARNESS_TARGET_URL.trim();
  }
  return 'https://beta.dexter.cash/';
}

function resolveWait(cliWait) {
  if (Number.isFinite(cliWait) && cliWait > 0) return cliWait;
  const envWait = Number(process.env.HARNESS_WAIT_MS);
  if (Number.isFinite(envWait) && envWait > 0) return envWait;
  return 45000;
}

function resolvePageSize(cliSize) {
  if (Number.isFinite(cliSize) && cliSize > 0) return cliSize;
  const envSize = Number(process.env.HARNESS_PAGE_SIZE);
  if (Number.isFinite(envSize) && envSize > 0) return envSize;
  return 5;
}

function parseStorageState() {
  const value = typeof process.env.HARNESS_STORAGE_STATE === 'string'
    ? process.env.HARNESS_STORAGE_STATE.trim()
    : '';
  return value || null;
}

function parseCookieHeader() {
  const value = typeof process.env.HARNESS_COOKIE === 'string'
    ? process.env.HARNESS_COOKIE.trim()
    : '';
  return value || null;
}

function parseAuthorizationHeader() {
  const value = typeof process.env.HARNESS_AUTHORIZATION === 'string'
    ? process.env.HARNESS_AUTHORIZATION.trim()
    : '';
  return value || null;
}

function parsePlaywrightCookies() {
  const value = typeof process.env.HARNESS_PLAYWRIGHT_COOKIES === 'string'
    ? process.env.HARNESS_PLAYWRIGHT_COOKIES.trim()
    : '';
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    console.warn('HARNESS_PLAYWRIGHT_COOKIES must be a JSON array; ignoring value.');
  } catch (error) {
    console.warn('Failed to parse HARNESS_PLAYWRIGHT_COOKIES:', error?.message || error);
  }
  return [];
}

function ensureBearerPrefix(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^bearer\s+/i.test(trimmed)) {
    const token = trimmed.replace(/^bearer\s+/i, '').trim();
    return token ? `Bearer ${token}` : null;
  }
  return `Bearer ${trimmed}`;
}

function extractRefreshTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const segments = cookieHeader.split(';');
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const name = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!name || !value) continue;
    if (!/sb-.*-refresh-token$/.test(name)) continue;
    let decoded = value;
    try { decoded = decodeURIComponent(value); } catch {}
    try {
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0]) {
        return parsed[0];
      }
    } catch {}
  }
  return null;
}

function resolveApiBase() {
  const raw = (process.env.HARNESS_API_BASE || process.env.DEXTER_API_BASE_URL || 'https://api.dexter.cash').trim();
  if (!raw) return 'https://api.dexter.cash';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

async function mintMcpBearerFromCookie(cookieHeader) {
  const refreshToken = extractRefreshTokenFromCookie(cookieHeader);
  if (!refreshToken) return null;
  const apiBase = resolveApiBase();
  const url = `${apiBase}/api/connector/oauth/token`;
  const form = new URLSearchParams();
  form.set('grant_type', 'refresh_token');
  form.set('refresh_token', refreshToken);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!response.ok) {
      if (process.env.HARNESS_DEBUG_SESSION === '1') {
        console.warn(`[pumpstream] MCP JWT mint failed (${response.status} ${response.statusText})`);
      }
      return null;
    }
    const data = await response.json().catch(() => null);
    const token = typeof data?.dexter_mcp_jwt === 'string' ? data.dexter_mcp_jwt.trim() : '';
    if (!token) {
      if (process.env.HARNESS_DEBUG_SESSION === '1') {
        console.warn('[pumpstream] dexter_mcp_jwt missing in token response; falling back.');
      }
      return null;
    }
    return ensureBearerPrefix(token);
  } catch (error) {
    console.warn('Failed to mint per-user MCP JWT:', error?.message || error);
    return null;
  }
}

function resolveStaticBearer() {
  return ensureBearerPrefix(
    process.env.TOKEN_AI_MCP_TOKEN || process.env.NEXT_PUBLIC_TOKEN_AI_MCP_TOKEN || '',
  );
}

async function resolveMcpBearer({ guest } = {}) {
  const demoBearer = resolveStaticBearer();

  if (guest) {
    if (demoBearer) {
      return { bearer: demoBearer, source: 'TOKEN_AI_MCP_TOKEN (guest fallback)' };
    }
    // Fall through so we can still honor HARNESS_MCP_TOKEN if someone sets it explicitly.
  }

  const envBearer = ensureBearerPrefix(process.env.HARNESS_MCP_TOKEN || '');
  if (envBearer) {
    return { bearer: envBearer, source: 'HARNESS_MCP_TOKEN' };
  }
  const staticBearer = demoBearer;
  if (staticBearer) {
    return { bearer: staticBearer, source: 'TOKEN_AI_MCP_TOKEN' };
  }
  const cookieHeader = parseCookieHeader();
  if (!cookieHeader) {
    return { bearer: null, source: 'none' };
  }
  const minted = await mintMcpBearerFromCookie(cookieHeader);
  if (minted) {
    return { bearer: minted, source: 'minted' };
  }
  return { bearer: null, source: 'none' };
}

async function runUiHarness({ prompt, targetUrl, waitMs, headless, saveArtifact, outputDir, guest }) {
  const storageState = guest ? null : parseStorageState();
  const authHeader = guest ? null : parseAuthorizationHeader();
  const cookieHeader = guest ? null : parseCookieHeader();
  const cookies = guest ? [] : parsePlaywrightCookies();

  if (!guest) {
    const supabaseToken = buildSupabaseToken();
    const hasBearer = !!authHeader || !!supabaseToken;
    if (hasBearer) {
      await createRealtimeSession({ supabaseToken, guest: false });
    }
    // Preflight realtime session to surface stale Supabase tokens before launching Playwright.
    // If we only have cookies (no bearer token yet), fall back to the real UI flow — it will
    // surface the PAT/disabled button if auth is still stale.
  }

  const extraHTTPHeaders = {};
  if (!guest) {
    if (authHeader) extraHTTPHeaders.Authorization = authHeader;
    if (cookieHeader) extraHTTPHeaders.cookie = cookieHeader;
  }

  const options = {
    prompt,
    targetUrl,
    waitMs,
    headless,
    saveArtifact,
    outputDir,
    storageState,
    extraHTTPHeaders: Object.keys(extraHTTPHeaders).length > 0 ? extraHTTPHeaders : undefined,
    cookies: cookies.length > 0 ? cookies : undefined,
  };

  const { artifact, artifactPath } = await runHarness(options);
  if (artifactPath) {
    process.stdout.write(`Saved artifact: ${artifactPath}\n`);
  } else if (saveArtifact) {
    process.stdout.write('Run completed without writing an artifact.\n');
  }
  return artifact;
}

async function fetchJson(url, { method = 'GET', headers = {}, body, signal } = {}) {
  const response = await fetch(url, {
    method,
    headers,
    body,
    signal,
  });
  const text = await response.text();
  if (!response.ok) {
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {}
    const error = new Error(`HTTP ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.body = parsed || text;
    throw error;
  }
  return text ? JSON.parse(text) : null;
}

async function createRealtimeSession({ supabaseToken, guest }) {
  const payload = supabaseToken
    ? { supabaseAccessToken: supabaseToken }
    : {
        guestProfile: {
          label: 'Dexter Demo Wallet',
          instructions:
            'Operate using the shared Dexter demo wallet with limited funds. Disable irreversible actions when possible and direct the user to sign in for full access.',
        },
      };
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (!guest) {
    const authHeader = parseAuthorizationHeader();
    const cookieHeader = parseCookieHeader();
    if (authHeader) {
      headers.set('Authorization', authHeader);
    }
    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }
  }
  const sessionUrl = process.env.HARNESS_SESSION_URL || 'https://api.dexter.cash/realtime/sessions';
  let session;
  try {
    session = await fetchJson(sessionUrl, {
      method: 'POST',
      headers: Object.fromEntries(headers.entries()),
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (!guest && error?.status === 401) {
      throw new Error('Supabase session appears to be expired (401 from realtime sessions). Run "npm run dexchat:refresh" and retry.');
    }
    const body = typeof error?.body === 'string' ? error.body : JSON.stringify(error?.body || '');
    if (!guest && error?.status === 403 && /bad_jwt/i.test(body)) {
      throw new Error('Supabase session rejected as bad JWT. Refresh HARNESS_COOKIE / HARNESS_AUTHORIZATION via "npm run dexchat:refresh".');
    }
    throw error;
  }
  if (!session?.client_secret?.value) {
    throw new Error('Realtime session response missing client_secret');
  }
  if (!guest && session?.dexter_session?.type === 'guest') {
    throw new Error('Realtime session downgraded to guest while authenticated. Refresh HARNESS_COOKIE / HARNESS_AUTHORIZATION and retry.');
  }
  return session;
}

function buildSupabaseToken() {
  const authHeader = parseAuthorizationHeader();
  if (authHeader) {
    const prefix = 'Bearer ';
    return authHeader.startsWith(prefix) ? authHeader.slice(prefix.length) : authHeader;
  }
  const cookieHeader = parseCookieHeader();
  if (cookieHeader && cookieHeader.includes('sb-')) {
    try {
      const match = cookieHeader.match(/sb-[^=]+=([^;]+)/);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]);
        const arr = JSON.parse(decoded);
        if (Array.isArray(arr) && typeof arr[0] === 'string') return arr[0];
      }
    } catch {}
  }
  return null;
}

async function callMcpTool({ session, pageSize, bearerOverride, guest }) {
  const { McpClient, StreamableHTTPClientTransport } = await loadMcpModules();
  const mcp = Array.isArray(session?.tools) ? session.tools.find((t) => t.type === 'mcp') : null;
  if (!mcp?.server_url) throw new Error('Session missing MCP connector info');

  const fallbackUrl = process.env.HARNESS_MCP_URL || 'https://mcp.dexter.cash/mcp';
  const serverUrl = typeof mcp.server_url === 'string' && !mcp.server_url.includes('<redacted>')
    ? mcp.server_url
    : fallbackUrl;

  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });
  if (!guest && mcp?.headers && typeof mcp.headers === 'object') {
    for (const [key, value] of Object.entries(mcp.headers)) {
      if (typeof value === 'string') headers.set(key, value);
    }
  }
  let bearerToUse = ensureBearerPrefix(bearerOverride || '');
  const existingAuth = headers.get('Authorization');
  if (!bearerToUse && existingAuth && !existingAuth.includes('<redacted>')) {
    bearerToUse = ensureBearerPrefix(existingAuth);
  }
  if (!bearerToUse && !guest) {
  const envFallback = ensureBearerPrefix(process.env.HARNESS_MCP_TOKEN || '')
      || resolveStaticBearer();
    if (envFallback) {
      if (!process.env.HARNESS_MCP_TOKEN && resolveStaticBearer()) {
        console.warn('HARNESS_MCP_TOKEN missing; using demo bearer fallback.');
      }
      bearerToUse = envFallback;
    }
  }
  if (bearerToUse) {
    headers.set('Authorization', bearerToUse);
  } else if (existingAuth && existingAuth.includes('<redacted>')) {
    headers.delete('Authorization');
    console.warn('No MCP bearer resolved; proceeding without Authorization header.');
  }

  const requestPayload = {
    name: 'pumpstream_live_summary',
    arguments: {
      pageSize,
      includeSpotlight: true,
      sort: 'marketCap',
      status: 'live',
    },
  };

  const headerObject = Object.fromEntries(headers.entries());
  const transport = new StreamableHTTPClientTransport(serverUrl, {
    requestInit: { headers: headerObject },
  });
  const client = new McpClient({ name: 'pumpstream-harness', version: '1.0.0' });

  try {
    await client.connect(transport);
    const toolResult = await client.callTool(requestPayload);
    await client.close();
    return {
      request: requestPayload,
      response: toolResult,
      structured: toolResult?.structuredContent || toolResult?.structured_content || null,
      rawContent: toolResult?.content || null,
    };
  } catch (error) {
    await client.close().catch(() => {});
    const message = error?.message ? String(error.message) : String(error);
    const isAuthMissing = /not initialized|oauth token required|unauthorized/i.test(message);
    if (isAuthMissing) {
      error.message = `${message} - MCP call was rejected; set HARNESS_MCP_TOKEN (or TOKEN_AI_MCP_TOKEN) to provide a bearer.`;
    }
    throw error;
  }
}

async function runApiHarness({ pageSize, bearerOverride, guest }) {
  const supabaseToken = guest ? null : buildSupabaseToken();
  const session = await createRealtimeSession({ supabaseToken, guest });
  if (process.env.HARNESS_DEBUG_SESSION === '1') {
    process.stdout.write(`Realtime session response:\n${JSON.stringify(session, null, 2)}\n`);
  }
  const toolResult = await callMcpTool({ session, pageSize, bearerOverride, guest });
  return {
    session: {
      id: session?.id ?? null,
      model: session?.model ?? null,
      sessionType: session?.dexter_session?.type ?? null,
    },
    tool: toolResult,
  };
}

function writeJsonSnapshot(filename, data) {
  try {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf8');
    process.stdout.write(`API artifact written to ${filename}\n`);
  } catch (error) {
    console.warn('Failed to write API artifact:', error?.message || error);
  }
}

function summarizeApiResult(result) {
  const structured = result?.tool?.structured;
  if (!structured) {
    process.stdout.write('No structured pumpstream data returned.\n');
    return;
  }
  const paging = structured.paging || {};
  const summary = {
    generatedAt: structured.generatedAt,
    totalAvailable: structured.totalAvailable,
    totalAfterFilter: structured.totalAfterFilter,
    totalReturned: structured.totalReturned,
    pageSize: paging.pageSize,
    offset: paging.offset,
    currentPage: paging.currentPage,
    totalPages: paging.totalPages,
    hasMore: paging.hasMore,
    nextOffset: paging.nextOffset,
    streamsPreview: Array.isArray(structured.streams)
      ? structured.streams.slice(0, 3).map((s) => ({ mintId: s.mintId, name: s.name, marketCapUsd: s.marketCapUsd, viewers: s.currentViewers }))
      : [],
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prompt = resolvePrompt(args.prompt);
  const targetUrl = resolveUrl(args.url);
  const waitMs = resolveWait(args.wait);
  const pageSize = resolvePageSize(args.pageSize);
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
      process.stdout.write('\n=== UI Harness (Playwright) ===\n');
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
    process.stdout.write('\n=== API Harness (direct MCP) ===\n');
    const bearerInfo = await resolveMcpBearer({ guest });
    if (!bearerInfo.bearer && process.env.HARNESS_DEBUG_SESSION === '1') {
      console.warn('[pumpstream] MCP bearer not resolved via env or cookie; proceeding unauthenticated.');
    }
    if (guest) {
      process.stdout.write('[guest] Running API harness without stored auth.\n');
    }
    const apiResult = await runApiHarness({ pageSize, bearerOverride: bearerInfo.bearer, guest });
    summarizeApiResult(apiResult);
    results.push({ mode: 'api', artifact: apiResult });
    if (args.json) {
      process.stdout.write(`${JSON.stringify({ mode: 'api', artifact: apiResult }, null, 2)}\n`);
    }
    if (saveArtifact) {
      const filename = path.join(outputDir, `pumpstream-api-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      writeJsonSnapshot(filename, apiResult);
    }
  }

  return results;
}

main()
  .catch((error) => {
    console.error('Pumpstream harness run failed:', error?.message || error);
    if (error?.body) console.error('Response body:', error.body);
    process.exitCode = 1;
  });
