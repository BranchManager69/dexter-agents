import { tool } from '@openai/agents/realtime';

type ToolCallArgs = Record<string, unknown> | undefined;

type McpToolResponse =
  | { content?: Array<Record<string, unknown>>; structuredContent?: unknown; isError?: boolean }
  | Array<Record<string, unknown>>
  | Record<string, unknown>;

const callMcp = async (toolName: string, args: ToolCallArgs = {}) => {
  const response = await fetch('/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ tool: toolName, arguments: args ?? {} }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`MCP call failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return (await response.json()) as McpToolResponse;
};

const normalizeResult = (result: McpToolResponse) => {
  if (Array.isArray(result)) {
    return { content: result };
  }
  if (result && typeof result === 'object' && 'content' in result) {
    return result;
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

export const resolveWallet = tool({
  name: 'resolve_wallet',
  description: 'Resolve the effective Dexter wallet for this session (override, resolver default, or fallback).',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async () => normalizeResult(await callMcp('resolve_wallet')),
});

export const listMyWallets = tool({
  name: 'list_my_wallets',
  description: 'List wallets linked to the authenticated Dexter account.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async () => normalizeResult(await callMcp('list_my_wallets')),
});

export const setSessionWalletOverride = tool({
  name: 'set_session_wallet_override',
  description: 'Override the wallet used for this MCP session until cleared.',
  parameters: {
    type: 'object',
    properties: {
      wallet_id: { type: 'string', description: 'Wallet identifier to activate for the rest of this session.' },
      clear: { type: 'boolean', description: 'When true, clear any override and revert to resolver defaults.' },
    },
    required: [],
    additionalProperties: false,
  },
  execute: async (input) => normalizeResult(await callMcp('set_session_wallet_override', input as ToolCallArgs)),
});

export const authInfo = tool({
  name: 'auth_info',
  description: 'Diagnostics for wallet resolution, bearer source and session overrides.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
  execute: async () => normalizeResult(await callMcp('auth_info')),
});

export const pumpstreamLiveSummary = tool({
  name: 'pumpstream_live_summary',
  description: 'Snapshot of live pump streams and token momentum from pump.dexter.cash.',
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
  },
  execute: async (input) => normalizeResult(await callMcp('pumpstream_live_summary', input as ToolCallArgs)),
});

export const dexterSearch = tool({
  name: 'search',
  description: 'Search Dexter connector documentation and playbooks.',
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
  },
  execute: async (input) => normalizeResult(await callMcp('search', input as ToolCallArgs)),
});

export const dexterFetch = tool({
  name: 'fetch',
  description: 'Fetch the full content of a Dexter knowledge document discovered via search.',
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
  },
  execute: async (input) => normalizeResult(await callMcp('fetch', input as ToolCallArgs)),
});

export const walletToolSet = [
  resolveWallet,
  listMyWallets,
  setSessionWalletOverride,
  authInfo,
];

export const intelToolSet = [
  pumpstreamLiveSummary,
  dexterSearch,
  dexterFetch,
];
