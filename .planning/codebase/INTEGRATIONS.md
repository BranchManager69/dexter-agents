# External Integrations

**Analysis Date:** 2026-01-28

## Architecture Overview

This is a Next.js 15 voice agent frontend that:
1. Authenticates users via Supabase
2. Establishes WebRTC realtime sessions with OpenAI Realtime API
3. Proxies tool calls to the Dexter MCP (Model Context Protocol) server
4. Displays tool results via custom renderers

## APIs & External Services

### OpenAI Realtime API
- **Purpose:** Voice agent backbone - audio in/out, ASR transcription, TTS, tool execution
- **SDK:** `@openai/agents-realtime` v0.1.3, `@openai/agents` v0.1.3
- **Transport:** WebRTC via `OpenAIRealtimeWebRTC`
- **Auth:** Ephemeral key fetched via `/api/session`
- **Endpoint proxy:** `/api/realtime/calls` → `https://api.openai.com/v1/realtime/calls`
- **Files:**
  - `src/app/hooks/useRealtimeSession.ts` (session management)
  - `src/app/api/realtime/calls/route.ts` (SDP proxy)
  - `src/app/api/session/route.ts` (ephemeral key mint)

### Dexter API (Backend)
- **Purpose:** Session creation, wallet management, prompt profiles, hedgefund controls
- **Base URL:** `NEXT_PUBLIC_DEXTER_API_ORIGIN` (default: `https://api.dexter.cash`)
- **Auth:** Supabase access tokens forwarded as Bearer
- **Files:**
  - `src/app/config/env.ts` (CONFIG + getDexterApiRoute helper)
  - `src/app/lib/hedgefund.ts` (hedgefund API client)

### Dexter MCP Server
- **Purpose:** Provides tools for Solana operations, web search, Twitter, trading
- **Endpoint:** `MCP_URL` or `NEXT_PUBLIC_MCP_URL` (default: `https://mcp.dexter.cash/mcp`)
- **Transport:** Streamable HTTP via `@modelcontextprotocol/sdk`
- **Auth:** Per-user JWT minted via `/api/connector/oauth/token` or shared fallback `TOKEN_AI_MCP_TOKEN`
- **Files:**
  - `src/app/api/mcp/auth.ts` (token minting, caching, client pooling)
  - `src/app/api/mcp/route.ts` (tool listing and invocation)
  - `src/app/api/mcp/status/route.ts` (identity state endpoint)

### Supabase Auth
- **Purpose:** User authentication (magic link, Twitter OAuth, Solana wallet)
- **SDK:** `@supabase/supabase-js` v2.47.0, `@supabase/auth-helpers-nextjs` v0.10.0
- **Config vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (served dynamically via `/auth/config`)
- **Files:**
  - `src/app/auth-context.tsx` (client-side auth provider)
  - `src/app/auth/supabaseServer.ts` (server-side helpers)
  - `src/app/auth/callback/route.ts` (session persistence)
  - `src/app/auth/logout/route.ts` (logout with MCP cache clear)

### Cloudflare Turnstile
- **Purpose:** Bot protection on authentication flows
- **SDK:** `@marsidev/react-turnstile` v1.0.5
- **Files:**
  - `src/app/components/TurnstileWidget.tsx`

## API Routes Summary

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/session` | GET | Mint OpenAI Realtime ephemeral key | Supabase session or guest |
| `/api/realtime/calls` | POST | Proxy WebRTC SDP to OpenAI | Ephemeral key header |
| `/api/mcp` | GET | List MCP tools | Cookie session |
| `/api/mcp` | POST | Invoke MCP tool | Cookie session |
| `/api/mcp/status` | GET | Return MCP identity state | Cookie session |
| `/api/tools` | GET | Fetch tool catalog | Cookie session |
| `/api/wallet/active` | GET | Get active wallet | Supabase access token |
| `/api/wallet/export` | GET | Export wallet private key | Supabase access token |
| `/api/prompt-profiles` | GET/POST | Manage prompt profiles | Supabase access token |
| `/api/prompt-profiles/[id]` | GET/PUT | CRUD individual profile | Supabase access token |
| `/api/prompt-profiles/active` | GET | Get active profile | Supabase access token |
| `/api/prompt-profiles/default` | GET | Get default profile | Supabase access token |
| `/api/prompt-profiles/preview` | GET | Preview profile rendering | Supabase access token |
| `/api/realtime/logs` | GET/POST | Session event logging | None |
| `/api/realtime/memories` | GET | Fetch conversation memories | Supabase access token |
| `/api/twitter/accounts` | GET | Twitter account lookup | Supabase access token |
| `/api/admin/dossier` | GET | Admin diagnostics | Supabase access token |
| `/api/transcript-log` | POST | Log transcript events | None |
| `/api/transcription-debug` | POST | Debug ASR events | None |
| `/auth/callback` | POST/DELETE | Supabase session sync | None |
| `/auth/logout` | POST | Sign out, clear caches | Cookie session |

## Authentication Flow

1. **Client bootstrap:** `AuthProvider` fetches `/auth/config` for Supabase credentials
2. **User login:** Magic link, Twitter OAuth, or Solana wallet via Supabase
3. **Session persistence:** `onAuthStateChange` POSTs to `/auth/callback` to reseal cookies
4. **MCP auth resolution:**
   - If Supabase session + refresh token → mint per-user MCP JWT via Dexter API
   - If mint fails or no session → use `TOKEN_AI_MCP_TOKEN` as fallback/guest
   - Identity states: `user`, `fallback`, `guest`, `none`
5. **Realtime session:** `/api/session` creates ephemeral key with user/guest profile
6. **Logout:** `/auth/logout` clears cookies + MCP auth caches

## MCP Integration Details

### Tool Invocation Flow
```
Client UI → /api/mcp POST → resolveMcpAuth() → getConnectedMcpServer() → server.callTool()
```

### Auth Resolution Logic (`src/app/api/mcp/auth.ts`)
1. Get Supabase session from cookies
2. Extract refresh token (session or cookie fallback)
3. If valid session + refresh → mint MCP JWT via Dexter API
4. Cache minted tokens by session ID with 30s expiry grace
5. Pool MCPServerStreamableHttp clients by cache key

### Tool Result Rendering
- Tool results flow through `handleMcpToolCallCompleted` in `useHandleSessionHistory.ts`
- Custom renderers in `src/app/components/toolNotes/renderers/`:
  - `solanaToken.tsx`, `solanaBalances.tsx`, `solanaSwap.tsx` (Solana operations)
  - `search.tsx`, `fetch.tsx` (web research)
  - `twitterSearch.tsx` (social)
  - `trade.tsx`, `pumpstream.tsx` (trading)
  - `walletResolve.tsx`, `walletAuth.tsx`, `walletList.tsx`, `walletOverride.tsx`
  - `codex.tsx` (Codex AI integration)

## Data Storage

### Client-Side
- **LocalStorage:** Tool catalog cache (`dexter.toolCatalog`)
- **Supabase cookies:** Auth tokens (`sb-{projectRef}-auth-token`)

### Server-Side
- **In-memory caches:**
  - `mintedTokenCache` (Map) - MCP JWT tokens by session ID
  - `clientCache` (Map) - MCPServerStreamableHttp instances
  - `cachedGuestInstructions` - Guest prompt profile (1 min TTL)

## Monitoring & Observability

### Logging
- **Framework:** Pino v10.1.0
- **Config:** `LOG_LEVEL` env var, `LOG_PRETTY` for PM2 readability
- **Scoped loggers:** `createScopedLogger({ scope: 'api.mcp' })`
- **File:** `src/server/logger.ts`

### Debug Endpoints
- `/api/transcription-debug` - ASR event beacon
- `/api/realtime/logs` - Session event sink
- `/api/wallet/debug` - Wallet resolution diagnostics

## Environment Configuration

### Required Variables
```
OPENAI_API_KEY           # OpenAI API key for realtime
SUPABASE_URL             # Supabase project URL
SUPABASE_ANON_KEY        # Supabase anon key
```

### Optional Variables
```
NEXT_PUBLIC_DEXTER_API_ORIGIN  # Dexter API base (default: https://api.dexter.cash)
NEXT_PUBLIC_MCP_URL            # MCP endpoint (default: https://mcp.dexter.cash/mcp)
TOKEN_AI_MCP_TOKEN             # Shared MCP bearer for fallback/guest
NEXT_PUBLIC_SITE_URL           # Site URL for redirects
NEXT_PUBLIC_ALLOW_GUEST_SESSIONS  # Enable guest access (default: true)
LOG_LEVEL                      # Pino log level (default: info in prod)
LOG_PRETTY                     # Enable pretty logging for PM2
```

### Model Configuration
```
NEXT_PUBLIC_OPENAI_REALTIME_MODEL
NEXT_PUBLIC_OPENAI_SUPERVISOR_MODEL
NEXT_PUBLIC_OPENAI_GUARDRAIL_MODEL
NEXT_PUBLIC_OPENAI_TRANSCRIPTION_MODEL
```

## Deployment

- **Process manager:** PM2
- **Ports:** 3210 (prod), 3211 (dev)
- **Build:** `npm run deploy` triggers build + PM2 restart
- **Scripts:** `src/app/api` routes are server-side Next.js App Router handlers

---

*Integration analysis: 2026-01-28*
