# Codebase Concerns

**Analysis Date:** 2026-01-28

## Tech Debt

### Pervasive `type Database = any`
- **Issue:** Every API route that uses Supabase declares `type Database = any` instead of proper typing
- **Files:**
  - `src/app/api/mcp/auth.ts:13`
  - `src/app/api/session/route.ts:11`
  - `src/app/api/wallet/active/route.ts:9`
  - `src/app/api/wallet/export/route.ts:9`
  - `src/app/api/twitter/accounts/route.ts:9`
  - `src/app/api/prompt-profiles/*.ts` (6 files)
  - `src/app/api/realtime/memories/route.ts:9`
  - `src/app/auth/supabaseServer.ts:4`
  - `src/app/types.ts:3`
- **Impact:** No compile-time safety for Supabase queries; errors caught only at runtime
- **Fix approach:** Generate Supabase types via `supabase gen types typescript` and share across routes

### Excessive `as any` Casts
- **Issue:** 158 instances of `as any` casts throughout the codebase
- **Files:** Concentrated in:
  - `src/app/hooks/useDexterAppController.ts` (~60 casts)
  - `src/app/hooks/useRealtimeSession.ts` (~25 casts)
  - `src/app/hooks/useHandleSessionHistory.ts` (~20 casts)
  - `src/app/agentConfigs/customerServiceRetail/tools.ts`
- **Impact:** Type safety bypassed; runtime errors not caught at compile time
- **Fix approach:** Create proper interfaces for:
  - MCP tool results (`extractStructuredPayload`, `normalizeBalancesPayload`)
  - Realtime session events (`handleTransportEvent`)
  - History items (`handleAgentToolStart`, etc.)

### OpenAI SDK Type Workarounds
- **Issue:** Multiple event handler registrations use `as any` to bypass SDK typing limitations
- **Files:** `src/app/hooks/useRealtimeSession.ts:414-422`
- **Example:**
  ```typescript
  try { s.off?.("agent_handoff", handleAgentHandoff as any); } catch {}
  ```
- **Impact:** If SDK changes signatures, errors won't be caught
- **Fix approach:** Contribute proper types to `@openai/agents-realtime` or use wrapper functions

### Inconsistent Error Handling Patterns
- **Issue:** Mix of `console.error`, scoped logger, and catch-and-ignore patterns
- **Files:**
  - `src/app/api/prompt-profiles/route.ts:67,103` (console.error)
  - `src/app/api/prompt-profiles/[id]/route.ts` (3 console.error calls)
  - `src/app/auth/callback/route.ts:30` (console.error)
- **Impact:** Inconsistent observability; some errors not properly logged
- **Fix approach:** Standardize on `createScopedLogger` for all API routes

## Security Considerations

### Private Key Export Endpoint
- **Risk:** `/api/wallet/export` returns raw private keys over HTTP
- **Files:** `src/app/api/wallet/export/route.ts`
- **Current mitigation:** Requires Supabase access token auth
- **Recommendations:**
  - Add rate limiting
  - Add audit logging for key exports
  - Consider requiring 2FA or re-authentication
  - Add IP allowlisting option for sensitive operations

### Shared MCP Token Fallback
- **Risk:** `TOKEN_AI_MCP_TOKEN` used for all guests means a leaked token compromises demo wallet
- **Files:** `src/app/api/mcp/auth.ts:21-23`
- **Current mitigation:** Only demo wallet accessible; limited tool access tier
- **Recommendations:**
  - Rotate shared token regularly
  - Consider per-session guest tokens
  - Monitor for unusual activity patterns

### Cookie Session Extraction
- **Risk:** Fallback logic parses refresh tokens from raw cookies
- **Files:** `src/app/api/mcp/auth.ts:414-447` (`extractRefreshTokenFromCookies`)
- **Impact:** If cookie format changes, silent auth failures
- **Recommendations:** Add alerting when fallback extraction is used

### CORS Wildcard on Realtime Proxy
- **Risk:** `/api/realtime/calls` returns `Access-Control-Allow-Origin: *`
- **Files:** `src/app/api/realtime/calls/route.ts:71`
- **Impact:** Any origin can use the proxy if they have a valid auth header
- **Recommendations:** Restrict to known origins in production

## Performance Bottlenecks

### In-Memory Token Caching
- **Problem:** `mintedTokenCache` and `clientCache` are per-process maps
- **Files:** `src/app/api/mcp/auth.ts:38-39`
- **Cause:** Serverless/multi-instance deployments don't share memory
- **Impact:** Redundant token mints; increased latency and API calls
- **Fix approach:** Use Redis or edge KV store for cross-instance caching

### No Connection Pooling for Dexter API
- **Problem:** Every API route creates fresh fetch requests to Dexter backend
- **Files:** All `/api/*` routes
- **Impact:** No HTTP keep-alive benefits; connection overhead per request
- **Fix approach:** Consider shared HTTP client with connection reuse

### Prompt Profile Resolution
- **Problem:** `resolveConciergeProfile` fetches multiple prompt modules sequentially
- **Files:** `src/app/agentConfigs/customerServiceRetail/promptProfile.ts:145-178`
- **Impact:** Guest instruction fetch can delay session creation
- **Fix approach:** Cache resolved profiles longer; fetch in parallel (already using Promise.all, but upstream is slow)

## Fragile Areas

### Realtime Event Handling
- **Files:** `src/app/hooks/useRealtimeSession.ts:87-334`
- **Why fragile:** Complex switch statement with 20+ event types; many undocumented event shapes
- **Safe modification:** Add comprehensive event logging before changing handlers
- **Test coverage:** No automated tests; relies on manual harness testing

### MCP Tool Result Normalization
- **Files:** `src/app/hooks/useDexterAppController.ts:322-604`
- **Why fragile:** Deep object traversal with many `as any` casts; handles multiple response formats
- **Functions:** `extractStructuredPayload`, `deriveActiveWalletMeta`, `normalizeBalancesPayload`
- **Safe modification:** Add unit tests with fixture files; don't change without regression testing
- **Test coverage:** No tests; uses live API

### History Handler State Machine
- **Files:** `src/app/hooks/useHandleSessionHistory.ts`
- **Why fragile:** Complex event correlation; pending tool calls tracked by ID
- **Functions:** `handleAgentToolStart`, `handleAgentToolEnd`, `handleMcpToolCallCompleted`
- **Safe modification:** Log all state transitions; add timeline debugging

## Missing Critical Features

### No Automated Testing
- **Problem:** No test suite for API routes or React hooks
- **Impact:** Regressions not caught; manual testing required
- **Files that need tests:**
  - `src/app/api/mcp/auth.ts` (token minting logic)
  - `src/app/hooks/useDexterAppController.ts` (wallet/balance parsing)
  - `src/app/hooks/useHandleSessionHistory.ts` (event handlers)

### No Rate Limiting
- **Problem:** API routes have no rate limiting
- **Impact:** Vulnerable to abuse; could exhaust OpenAI/MCP quotas
- **Affected routes:**
  - `/api/session` (mints ephemeral keys)
  - `/api/mcp` (calls external MCP)
  - `/api/wallet/export` (sensitive operation)

### No Health Check Endpoint
- **Problem:** No `/health` or `/readiness` endpoint
- **Impact:** Load balancers and monitoring can't verify service health
- **Fix approach:** Add `src/app/api/health/route.ts` that checks Supabase + MCP connectivity

### Incomplete Error Reporting
- **Problem:** Client-side errors not aggregated
- **Impact:** User issues hard to debug without reproduction steps
- **Fix approach:** Add Sentry or similar error reporting

## Test Coverage Gaps

### API Routes
- **What's not tested:** All 17+ API routes
- **Files:** `src/app/api/**/*.ts`
- **Risk:** Auth bypass, data corruption, service disruption
- **Priority:** High

### Hook Logic
- **What's not tested:** Complex state management in hooks
- **Files:**
  - `src/app/hooks/useRealtimeSession.ts`
  - `src/app/hooks/useDexterAppController.ts`
  - `src/app/hooks/useHandleSessionHistory.ts`
- **Risk:** Silent failures in voice session or tool display
- **Priority:** High

### Wallet Key Formatting
- **What's not tested:** Base58 decode/encode, format conversion
- **Files:** `src/app/lib/wallet/keyFormat.ts`
- **Risk:** Key corruption could lock users out of wallets
- **Priority:** Critical

## Scaling Limits

### WebRTC Session Limits
- **Current capacity:** Bound by client browser + OpenAI quotas
- **Limit:** Unknown concurrent sessions before degradation
- **Scaling path:** Monitor via `/api/realtime/logs`; add session metrics

### MCP Client Pooling
- **Current capacity:** One cached client per (user, token) pair
- **Limit:** Memory pressure with many concurrent users
- **Scaling path:** Add LRU eviction to `clientCache`

## Dependencies at Risk

### `@openai/agents-realtime` v0.1.3
- **Risk:** Very early version (0.1.x); API likely unstable
- **Impact:** Breaking changes could require significant refactoring
- **Migration plan:** Pin version; track changelog; budget time for SDK updates

### `@supabase/auth-helpers-nextjs` v0.10.0
- **Risk:** Auth helpers can be finnicky with Next.js version updates
- **Impact:** Cookie handling may break on Next.js upgrades
- **Migration plan:** Test auth flow thoroughly after any Next.js update

## Code Quality Issues

### Large Files
- `src/app/hooks/useDexterAppController.ts` (2798+ lines)
  - Should be split into:
    - Wallet management
    - Balance handling
    - Signal processing
    - Session state

### Mixed Concerns
- `src/app/api/mcp/auth.ts` handles:
  - Auth resolution
  - Token caching
  - Client pooling
  - Identity summarization
- Should be split into separate modules

### Console Logging in Production Code
- 12 instances of `console.error`/`console.warn` in API routes
- Should use scoped logger consistently

---

*Concerns audit: 2026-01-28*
