import { tool } from '@openai/agents/realtime';
import { setMcpStatusError, updateMcpStatusFromHeaders } from '@/app/state/mcpStatusStore';
import { CONFIG, getDexterApiRoute } from '@/app/config/env';
import { getDefaultConciergeProfileDefinition, type ResolvedConciergeProfile } from './promptProfile';

type ToolCallArgs = Record<string, unknown> | undefined;

type McpToolResponse =
  | { content?: Array<Record<string, unknown>>; structuredContent?: unknown; isError?: boolean }
  | Array<Record<string, unknown>>
  | Record<string, unknown>;

const callMcp = async (toolName: string, args: ToolCallArgs = {}) => {
  let stateSnapshotCaptured = false;
  try {
    const response = await fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ tool: toolName, arguments: args ?? {} }),
    });

    if (response.headers.has('x-dexter-mcp-state')) {
      stateSnapshotCaptured = true;
      updateMcpStatusFromHeaders(response);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`MCP call failed (${response.status}): ${text.slice(0, 200)}`);
    }

    return (await response.json()) as McpToolResponse;
  } catch (error) {
    if (!stateSnapshotCaptured) {
      setMcpStatusError(error instanceof Error ? error.message : undefined);
    }
    throw error;
  }
};

const normalizeResult = (result: McpToolResponse) => {
  if (Array.isArray(result)) {
    return { content: result };
  }

  if (result && typeof result === 'object') {
    const structured =
      'structuredContent' in result
        ? (result as any).structuredContent
        : 'structured_content' in result
          ? (result as any).structured_content
          : undefined;
    const hasStructured = structured !== undefined;
    const hasContent = Array.isArray((result as any).content);

    if (hasStructured || hasContent) {
      const normalized: Record<string, unknown> = { ...result };

      if (hasStructured && !('structuredContent' in normalized)) {
        normalized.structuredContent = structured;
      }

      if (!hasContent) {
        const fallbackText = typeof structured === 'string'
          ? structured
          : structured !== undefined
            ? JSON.stringify(structured)
            : typeof result === 'string'
              ? result
              : JSON.stringify(result);

        normalized.content = [
          {
            type: 'text',
            text: fallbackText,
          },
        ];
      }

      return normalized;
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: typeof result === 'string' ? result : JSON.stringify(result),
      },
    ],
  };
};

const TOOL_FALLBACKS = getDefaultConciergeProfileDefinition().toolDescriptions;

type ConciergeToolName = keyof typeof TOOL_FALLBACKS;

type ConciergeToolset = Record<ConciergeToolName, ReturnType<typeof tool>>;

function describeTool(name: ConciergeToolName, overrides?: Record<string, string>): string {
  const override = overrides?.[name];
  if (override && override.trim().length) {
    return override;
  }
  const fallback = TOOL_FALLBACKS[name]?.fallback;
  return fallback || `MCP tool: ${name}`;
}

export function createConciergeToolset(toolDescriptions: Record<string, string> = {}): ConciergeToolset {
  return {
    resolve_wallet: tool({
      name: 'resolve_wallet',
      description: describeTool('resolve_wallet', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async () => normalizeResult(await callMcp('resolve_wallet')),
    }),
    list_my_wallets: tool({
      name: 'list_my_wallets',
      description: describeTool('list_my_wallets', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async () => normalizeResult(await callMcp('list_my_wallets')),
    }),
    set_session_wallet_override: tool({
      name: 'set_session_wallet_override',
      description: describeTool('set_session_wallet_override', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          wallet_id: { type: 'string', description: 'Wallet identifier to activate for the rest of this session.' },
          clear: { type: 'boolean', description: 'When true, clear any override and revert to resolver defaults.' },
        },
        required: [],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('set_session_wallet_override', input as ToolCallArgs)),
    }),
    auth_info: tool({
      name: 'auth_info',
      description: describeTool('auth_info', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async () => normalizeResult(await callMcp('auth_info')),
    }),
    pumpstream_live_summary: tool({
      name: 'pumpstream_live_summary',
      description: describeTool('pumpstream_live_summary', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of streams to include (1-10).',
          },
        },
        required: [],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('pumpstream_live_summary', input as ToolCallArgs)),
    }),
    gmgn_fetch_token_snapshot: tool({
      name: 'gmgn_fetch_token_snapshot',
      description: describeTool('gmgn_fetch_token_snapshot', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          token_address: {
            type: 'string',
            description:
              'Token identifier accepted by GMGN (raw Solana mint or prefixed slug such as solscan_<mint>).',
          },
          chain: {
            type: 'string',
            description: 'Optional GMGN chain key; defaults to sol.',
          },
          resolution: {
            type: 'string',
            description: 'Candle resolution string (e.g. 1m, 5m, 1H).',
          },
          candle_limit: {
            type: 'number',
            description: 'Maximum candles to request (10-500).',
          },
          include_trades: {
            type: 'boolean',
            description: 'Include recent trade listings in the response.',
          },
          include_security: {
            type: 'boolean',
            description: 'Include security/launchpad diagnostics in the response.',
          },
          include_candles: {
            type: 'boolean',
            description: 'Include OHLCV candle data in the response.',
          },
          timeout_ms: {
            type: 'number',
            description: 'Override the headless request timeout (5000-120000 ms).',
          },
        },
        required: ['token_address'],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('gmgn_fetch_token_snapshot', input as ToolCallArgs)),
    }),
    kolscan_leaderboard: tool({
      name: 'kolscan_leaderboard',
      description: describeTool('kolscan_leaderboard', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            enum: ['daily', 'weekly', 'monthly', '1', '7', '30'],
            description: 'Leaderboard window; accepts labels (daily/weekly/monthly) or numeric days (1,7,30).',
          },
          limit: {
            type: 'number',
            description: 'Maximum entrants to return (1-200).',
          },
          sortBy: {
            type: 'string',
            description: 'Sort key (profit, wins, losses, name).',
          },
          direction: {
            type: 'string',
            description: 'Sort direction (desc or asc).',
          },
          format: {
            type: 'string',
            description: 'Set to full, stats, or handles to trim the payload.',
          },
          minProfit: {
            type: 'number',
            description: 'Minimum profit filter (SOL).',
          },
          maxProfit: {
            type: 'number',
            description: 'Maximum profit filter (SOL).',
          },
          minWins: {
            type: 'number',
            description: 'Minimum wins filter.',
          },
          maxWins: {
            type: 'number',
            description: 'Maximum wins filter.',
          },
          minLosses: {
            type: 'number',
            description: 'Minimum losses filter.',
          },
          maxLosses: {
            type: 'number',
            description: 'Maximum losses filter.',
          },
          requireTwitter: {
            type: 'boolean',
            description: 'If true, only include entrants with a Twitter handle.',
          },
          requireTelegram: {
            type: 'boolean',
            description: 'If true, only include entrants with a Telegram link.',
          },
        },
        required: [],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('kolscan_leaderboard', input as ToolCallArgs)),
    }),
    kolscan_wallet_detail: tool({
      name: 'kolscan_wallet_detail',
      description: describeTool('kolscan_wallet_detail', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          walletAddress: {
            type: 'string',
            description: 'Target Kolscan wallet address.',
          },
          timeframe: {
            type: 'string',
            pattern: '^(\\d+)([smhd])?$',
            description: 'Time window as digits with optional s/m/h/d suffix (e.g. 1d, 12h, 30d).',
          },
          format: {
            type: 'string',
            description: 'Response mode: summary, trades, or full.',
          },
          limit: {
            type: 'number',
            description: 'Maximum trades to return (1-5000).',
          },
        },
        required: ['walletAddress'],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('kolscan_wallet_detail', input as ToolCallArgs)),
    }),
    kolscan_trending_tokens: tool({
      name: 'kolscan_trending_tokens',
      description: describeTool('kolscan_trending_tokens', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          timeframe: {
            type: 'string',
            pattern: '^(\\d+)([smhd])?$',
            description: 'Window to analyze as digits with optional s/m/h/d suffix (e.g. 1d, 12h, 30d).',
          },
          minKols: {
            type: 'number',
            description: 'Minimum distinct KOLs required per token.',
          },
          limit: {
            type: 'number',
            description: 'Maximum tokens to return (1-100).',
          },
          wallets: {
            type: 'string',
            description: 'Optional comma-separated wallet list to filter.',
          },
          txLimit: {
            type: 'number',
            description: 'Internal transaction cap (defaults to 5000).',
          },
        },
        required: [],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('kolscan_trending_tokens', input as ToolCallArgs)),
    }),
    kolscan_token_detail: tool({
      name: 'kolscan_token_detail',
      description: describeTool('kolscan_token_detail', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          tokenAddress: {
            type: 'string',
            description: 'Token mint/address to analyze.',
          },
          timeframe: {
            type: 'string',
            pattern: '^(\\d+)([smhd])?$',
            description: 'Time window as digits with optional s/m/h/d suffix (e.g. 1d, 7d, 30d).',
          },
          format: {
            type: 'string',
            description: 'Response mode: summary, trades, or full.',
          },
          limit: {
            type: 'number',
            description: 'Maximum trades to fetch (1-5000).',
          },
        },
        required: ['tokenAddress'],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('kolscan_token_detail', input as ToolCallArgs)),
    }),
    kolscan_resolve_wallet: tool({
      name: 'kolscan_resolve_wallet',
      description: describeTool('kolscan_resolve_wallet', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Handle or text to resolve (wallet, Twitter, Telegram, etc.).',
          },
          limit: {
            type: 'number',
            description: 'Maximum matches to return (1-50).',
          },
        },
        required: ['query'],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('kolscan_resolve_wallet', input as ToolCallArgs)),
    }),
    search: tool({
      name: 'search',
      description: describeTool('search', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search string describing the desired topic.',
          },
        },
        required: [],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('search', input as ToolCallArgs)),
    }),
    fetch: tool({
      name: 'fetch',
      description: describeTool('fetch', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Identifier returned by the search tool.',
          },
        },
        required: ['id'],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('fetch', input as ToolCallArgs)),
    }),
    twitter_search: tool({
      name: 'twitter_search',
      description: describeTool('twitter_search', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Primary search query (ticker, hashtag, keyword).',
          },
          queries: {
            type: 'array',
            description: 'Additional queries to merge into the result set.',
            items: { type: 'string' },
          },
          ticker: {
            type: 'string',
            description: 'Ticker shorthand to expand into multiple search presets.',
          },
          max_results: {
            type: 'number',
            description: 'Maximum tweets to return (1-100).',
          },
          include_replies: {
            type: 'boolean',
            description: 'Whether to include replies (default true).',
          },
          language: {
            type: 'string',
            description: 'Filter results to a language code (e.g. en, es).',
          },
          media_only: {
            type: 'boolean',
            description: 'Only return tweets that contain media.',
          },
          verified_only: {
            type: 'boolean',
            description: 'Only return tweets from verified accounts.',
          },
        },
        required: [],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('twitter_search', input as ToolCallArgs)),
    }),
    codex_start: tool({
      name: 'codex_start',
      description: describeTool('codex_start', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Initial instruction or question for Codex.',
          },
        },
        required: ['prompt'],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('codex_start', input as ToolCallArgs)),
    }),
    codex_reply: tool({
      name: 'codex_reply',
      description: describeTool('codex_reply', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          conversation_id: {
            type: 'string',
            description: 'Identifier returned by codex_start in structuredContent.conversationId.',
          },
          prompt: {
            type: 'string',
            description: 'Follow-up instruction or question for Codex.',
          },
        },
        required: ['conversation_id', 'prompt'],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('codex_reply', input as ToolCallArgs)),
    }),
    codex_exec: tool({
      name: 'codex_exec',
      description: describeTool('codex_exec', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Instruction or question for Codex exec mode.',
          },
          output_schema: {
            type: 'string',
            description: 'JSON schema describing the desired final response shape.',
          },
          metadata: {
            type: 'object',
            description: 'Optional metadata to inject into the Codex prompt preface.',
            additionalProperties: true,
          },
        },
        required: ['prompt'],
        additionalProperties: true,
      } as const,
      strict: false,
      execute: async (input) => normalizeResult(await callMcp('codex_exec', input as ToolCallArgs)),
    }),
    stream_public_shout: tool({
      name: 'stream_public_shout',
      description: describeTool('stream_public_shout', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Send a short shout (5-280 characters) for Dexter to highlight on stream.',
          },
          alias: {
            type: 'string',
            description: 'Optional display name (2-32 characters).',
          },
        },
        required: ['message'],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('stream_public_shout', input as ToolCallArgs)),
    }),
    stream_shout_feed: tool({
      name: 'stream_shout_feed',
      description: describeTool('stream_shout_feed', toolDescriptions),
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of recent shouts to fetch (1-50).',
          },
        },
        required: [],
        additionalProperties: false,
      } as const,
      strict: true,
      execute: async (input) => normalizeResult(await callMcp('stream_shout_feed', input as ToolCallArgs)),
    }),
  };
}

export function createConciergeToolsetFromProfile(profile: ResolvedConciergeProfile): ConciergeToolset {
  return createConciergeToolset(profile.toolDescriptions);
}

const defaultConciergeToolset = createConciergeToolset();

export const resolveWallet = defaultConciergeToolset.resolve_wallet;
export const listMyWallets = defaultConciergeToolset.list_my_wallets;
export const setSessionWalletOverride = defaultConciergeToolset.set_session_wallet_override;
export const authInfo = defaultConciergeToolset.auth_info;
export const pumpstreamLiveSummary = defaultConciergeToolset.pumpstream_live_summary;
export const dexterSearch = defaultConciergeToolset.search;
export const dexterFetch = defaultConciergeToolset.fetch;
export const codexStart = defaultConciergeToolset.codex_start;
export const codexReply = defaultConciergeToolset.codex_reply;
export const codexExec = defaultConciergeToolset.codex_exec;
type RemoteToolMeta = {
  name?: string;
  title?: string;
  description?: string;
  summary?: string;
  input_schema?: unknown;
  inputSchema?: unknown;
  parameters?: unknown;
  _meta?: {
    category?: string;
    access?: string;
    tags?: string[];
    icon?: string;
  };
};

const DEFAULT_PARAMETERS = {
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: true,
};

function coerceParameters(meta: RemoteToolMeta) {
  const candidate =
    (meta.parameters && typeof meta.parameters === 'object' && meta.parameters) ||
    (meta.input_schema && typeof meta.input_schema === 'object' && meta.input_schema) ||
    (meta.inputSchema && typeof meta.inputSchema === 'object' && meta.inputSchema);
  if (candidate) return candidate as Record<string, unknown>;
  return DEFAULT_PARAMETERS;
}

function createToolFromMeta(meta: RemoteToolMeta) {
  const rawName = meta.name?.trim();
  if (!rawName) return null;
  const description = meta.description || meta.summary || meta.title || 'Dexter MCP tool';
  const parameters = coerceParameters(meta);
  return tool({
    name: rawName,
    description,
    parameters: parameters as any,
    strict: true,
    execute: async (input) => normalizeResult(await callMcp(rawName, input as ToolCallArgs)),
  });
}

function dedupeTools<T extends { name: string }>(list: T[]): T[] {
  const seen = new Map<string, T>();
  for (const item of list) {
    if (!seen.has(item.name)) {
      seen.set(item.name, item);
    }
  }
  return Array.from(seen.values());
}

export async function loadDexterVoiceTools(): Promise<ReturnType<typeof tool>[]> {
  const url = getDexterApiRoute('/tools');
  const headers: Record<string, string> = {};
  if (CONFIG.mcpToken) {
    headers.Authorization = `Bearer ${CONFIG.mcpToken}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Tool catalog request failed (${response.status} ${response.statusText}): ${body.slice(0, 200)}`);
  }

  const json = await response.json();
  const rawTools: RemoteToolMeta[] = Array.isArray(json?.tools)
    ? (json.tools as RemoteToolMeta[])
    : Array.isArray(json)
    ? (json as RemoteToolMeta[])
    : [];

  const dynamic = rawTools
    .map(createToolFromMeta)
    .filter(Boolean) as ReturnType<typeof tool>[];

  if (dynamic.length === 0) {
    throw new Error('Tool catalog returned no entries.');
  }

  return dedupeTools(dynamic);
}
