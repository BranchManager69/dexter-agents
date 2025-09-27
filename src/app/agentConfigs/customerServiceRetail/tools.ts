import { tool } from '@openai/agents/realtime';
import { setMcpStatusError, updateMcpStatusFromHeaders } from '@/app/state/mcpStatusStore';
import { CONFIG, getDexterApiRoute } from '@/app/config/env';

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
  } as const,
  strict: true,
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
  } as const,
  strict: true,
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
  } as const,
  strict: true,
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
  } as const,
  strict: true,
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
  } as const,
  strict: true,
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
  } as const,
  strict: true,
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
  } as const,
  strict: true,
  execute: async (input) => normalizeResult(await callMcp('fetch', input as ToolCallArgs)),
});

export const codexStart = tool({
  name: 'codex_start',
  description: 'Start a Codex reasoning session and return a conversation identifier.',
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
});

export const codexReply = tool({
  name: 'codex_reply',
  description: 'Continue an existing Codex session using the conversation_id.',
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
});

export const codexExec = tool({
  name: 'codex_exec',
  description:
    'Run Codex in exec mode. Optionally pass output_schema (stringified JSON) for structured replies.',
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
});

export const staticDexterVoiceTools = [
  resolveWallet,
  listMyWallets,
  setSessionWalletOverride,
  authInfo,
  pumpstreamLiveSummary,
  dexterSearch,
  dexterFetch,
  codexStart,
  codexExec,
  codexReply,
];

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
  try {
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
      throw new Error(`Failed to fetch tool catalog (${response.status})`);
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
      return staticDexterVoiceTools;
    }

    return dedupeTools([...dynamic, ...staticDexterVoiceTools]);
  } catch (error) {
    console.warn('[dexter-agents] Falling back to static tool list:', error);
    return staticDexterVoiceTools;
  }
}
