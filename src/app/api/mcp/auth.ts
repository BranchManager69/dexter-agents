import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { MCPServerStreamableHttp } from '@openai/agents-core';
import { cookies } from 'next/headers';

import type { Session } from '@supabase/supabase-js';

import { getDexterApiRoute } from '@/app/config/env';

type Database = any;

const MCP_URL = (
  process.env.MCP_URL ||
  process.env.NEXT_PUBLIC_MCP_URL ||
  'https://mcp.dexter.cash/mcp'
).replace(/\/$/, '');

const SHARED_BEARER = ensureBearerPrefix(
  process.env.TOKEN_AI_MCP_TOKEN || process.env.NEXT_PUBLIC_TOKEN_AI_MCP_TOKEN || ''
);

const TOKEN_EXPIRY_GRACE_MS = 30_000;

interface MintCacheEntry {
  bearer: string;
  expiresAt: number;
}

interface CachedClient {
  token: string | null;
  server: MCPServerStreamableHttp;
  connecting: Promise<void> | null;
}

const mintedTokenCache = new Map<string, MintCacheEntry>();
const clientCache = new Map<string, CachedClient>();

export type McpIdentityState = 'user' | 'fallback' | 'guest' | 'none';

export interface McpAuthDetails {
  bearer: string | null;
  cacheKey: string;
  identity: McpIdentityState;
  minted: boolean;
  sessionId?: string | null;
  user?: { id?: string | null; email?: string | null } | null;
}

export interface McpIdentitySummary {
  state: McpIdentityState | 'loading' | 'error';
  label: string;
  detail?: string;
}

export async function resolveMcpAuth(): Promise<McpAuthDetails> {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const refreshToken = getRefreshToken(session) || extractRefreshTokenFromCookies(cookieStore.getAll());
  const sessionId = session?.session_id ?? null;

  if (session && refreshToken && sessionId) {
    const minted = await resolveMintedBearer(sessionId, refreshToken);
    if (minted) {
      return {
        bearer: minted,
        cacheKey: `user:${sessionId}`,
        identity: 'user',
        minted: true,
        sessionId,
        user: session.user
          ? { id: session.user.id, email: session.user.email ?? null }
          : null,
      };
    }
    if (SHARED_BEARER) {
      return {
        bearer: SHARED_BEARER,
        cacheKey: 'shared',
        identity: 'fallback',
        minted: false,
        sessionId,
        user: session.user
          ? { id: session.user.id, email: session.user.email ?? null }
          : null,
      };
    }
  }

  if (SHARED_BEARER) {
    return {
      bearer: SHARED_BEARER,
      cacheKey: 'shared',
      identity: session ? 'fallback' : 'guest',
      minted: false,
      sessionId: session?.session_id ?? null,
      user: session?.user
        ? { id: session.user.id, email: session.user.email ?? null }
        : null,
    };
  }

  return {
    bearer: null,
    cacheKey: 'shared',
    identity: 'none',
    minted: false,
    sessionId: session?.session_id ?? null,
    user: session?.user
      ? { id: session.user.id, email: session.user.email ?? null }
      : null,
  };
}

export async function getConnectedMcpServer(auth: McpAuthDetails) {
  const cacheEntry = getClientEntry(auth.cacheKey, auth.bearer);
  if (!cacheEntry.connecting) {
    cacheEntry.connecting = cacheEntry.server
      .connect()
      .then(() => {
        cacheEntry.connecting = null;
      })
      .catch((error) => {
        cacheEntry.connecting = null;
        clientCache.delete(auth.cacheKey);
        throw error;
      });
  }
  if (cacheEntry.connecting) {
    await cacheEntry.connecting;
  }
  return cacheEntry.server;
}

export function summarizeIdentity(auth: McpAuthDetails): McpIdentitySummary {
  switch (auth.identity) {
    case 'user':
      return {
        state: 'user',
        label: 'Personal wallets',
        detail: auth.user?.email ?? undefined,
      };
    case 'fallback':
      return {
        state: 'fallback',
        label: 'Shared fallback',
        detail: 'Using shared bearer',
      };
    case 'guest':
      return {
        state: 'guest',
        label: 'Demo wallet',
        detail: 'Guest session',
      };
    default:
      return {
        state: 'none',
        label: 'Unavailable',
        detail: 'No MCP token',
      };
  }
}

function getClientEntry(key: string, token: string | null): CachedClient {
  const cached = clientCache.get(key);
  if (cached && cached.token === token) {
    return cached;
  }

  const headers = token ? { Authorization: token } : undefined;
  const server = new MCPServerStreamableHttp({
    url: MCP_URL,
    requestInit: headers ? { headers } : undefined,
    cacheToolsList: true,
  });

  const entry: CachedClient = { token, server, connecting: null };
  clientCache.set(key, entry);
  return entry;
}

async function resolveMintedBearer(sessionId: string, refreshToken: string) {
  const cached = mintedTokenCache.get(sessionId);
  const now = Date.now();
  if (cached && cached.expiresAt - TOKEN_EXPIRY_GRACE_MS > now) {
    return cached.bearer;
  }

  const minted = await mintDexterMcpJwt(refreshToken);
  if (minted) {
    mintedTokenCache.set(sessionId, minted);
    return minted.bearer;
  }

  mintedTokenCache.delete(sessionId);
  return null;
}

async function mintDexterMcpJwt(refreshToken: string): Promise<MintCacheEntry | null> {
  try {
    const form = new URLSearchParams();
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', refreshToken);

    const response = await fetch(getDexterApiRoute('/api/connector/oauth/token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json().catch(() => null);
    const bearerValue = typeof data?.dexter_mcp_jwt === 'string' ? data.dexter_mcp_jwt.trim() : '';
    if (!bearerValue) {
      return null;
    }

    const expiresIn = Number(data?.expires_in) || 3600;
    return {
      bearer: ensureBearerPrefix(bearerValue),
      expiresAt: Date.now() + expiresIn * 1000,
    };
  } catch (error) {
    console.warn('[mcp] Failed to mint per-user bearer', error instanceof Error ? error.message : error);
    return null;
  }
}

function getRefreshToken(session: Session | null | undefined) {
  const token = session?.refresh_token;
  return token && token.trim().length > 0 ? token : null;
}

function extractRefreshTokenFromCookies(entries: { name: string; value: string }[]) {
  for (const entry of entries) {
    if (!entry.name.includes('-refresh-token')) continue;
    try {
      const decoded = decodeURIComponent(entry.value);
      const parsed = JSON.parse(decoded);
      const candidate = Array.isArray(parsed)
        ? parsed[1]
        : typeof parsed?.refresh_token === 'string'
          ? parsed.refresh_token
          : null;
      if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    } catch (error) {
      console.warn('[mcp] Failed to parse refresh token cookie', error instanceof Error ? error.message : error);
    }
  }
  return null;
}

function ensureBearerPrefix(raw: string) {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^bearer\s+/i.test(trimmed)) {
    return `Bearer ${trimmed.slice(6).trim()}`;
  }
  return `Bearer ${trimmed}`;
}
