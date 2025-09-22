# Realtime Session Flow

## Quick Reference
- **Frontend trigger:** `useRealtimeSession.fetchEphemeralKey()` → `GET /api/session`
- **Server proxy:** `src/app/api/session/route.ts` → `POST https://api.dexter.cash/realtime/sessions`
- **Realtime model:** `MODEL_IDS.realtime` (default `gpt-realtime` unless overridden via env)
- **Return payload:** ephemeral `client_secret`, voice + model settings, MCP tool wiring (sanitized)

## Current Flow (Unauthenticated)
1. **Connect click**
   - `App.tsx` hooks call `fetchEphemeralKey`, hitting `GET /api/session` from the browser.
2. **Next.js API route**
   - `route.ts` forwards the request to `getDexterApiRoute('/realtime/sessions')` with `model: MODEL_IDS.realtime`.
   - On non-200 responses, we log `/api/session upstream` and bubble back a `502`.
3. **Sanitization**
   - Strip `tools` from the upstream payload; default the client to local MCP tooling.
   - Append an MCP reminder to the instructions.
   - Return JSON containing the ephemeral `client_secret` plus UI metadata.
4. **Client bootstrap**
   - `useRealtimeSession` hands `client_secret` to the OpenAI WebRTC SDK.
   - SDK creates the peer connection, pulls audio, and starts the event stream.

```
Browser ──GET /api/session──▶ Next.js ──POST /realtime/sessions──▶ Dexter API ──▶ OpenAI
   │                                                                             │
   └─────────────── ephemeral client_secret ◀────────────────────────────────────┘
```

## Logging & Troubleshooting
- Success log: `/api/session ok { id, model, hasTools }` inside `logs/dexter-agents.log`.
- Failure log: `/api/session upstream { status, body }` when the Dexter API rejects the request.
- Quick health check: `curl -s http://localhost:3210/api/session` while tailing `npm run logs -- --nostream`.

## Upcoming Auth Integration
| Step | Focus | Notes |
| --- | --- | --- |
| 1 | **Accept logged-in identity** | Ensure `/api/session` validates the Supabase session (cookie/JWT). Reject anonymous calls once auth is live. |
| 2 | **Forward user context upstream** | Include user identifiers in the POST (headers or JSON metadata) so Dexter API can personalize rate limits, audit, etc. |
| 3 | **Propagate tool entitlements** | Optionally allow the backend to return user-specific MCP tools. Merge them rather than stripping. |
| 4 | **Persist session telemetry** | Tag OpenAI session IDs with the authenticated user for later analytics / billing. |

## Reusing the Existing Supabase Auth
- The primary site already issues Supabase auth cookies. As long as they are set for `.dexter.cash`, `beta.dexter.cash` can read them without extra work.
- Next.js API routes can access the Supabase session via the cookie or by instantiating the Supabase client with the shared service key.
- Plan: reuse the shared middleware (e.g., `withAuth`) so `/api/session` gets both the user ID and access token.
- Once active, add auth-aware tests/documentation updates here.

## Checklist for Future Updates
- [ ] Authenticated flow diagram (add once login is wired up).
- [ ] Document headers/body fields we forward to Dexter API for user context.
- [ ] Note any rate limiting or quota enforcement once implemented.
- [ ] Add reference to Supabase middleware helpers when the code lands.
