# Realtime Session Flow

## Quick Reference
- **Frontend trigger:** `useRealtimeSession.fetchEphemeralKey()` → `GET /api/session`
- **Server proxy:** `src/app/api/session/route.ts` → `POST https://api.dexter.cash/realtime/sessions`
- **Realtime model:** `MODEL_IDS.realtime` (default `gpt-realtime` unless overridden via env)
- **Return payload:** ephemeral `client_secret`, voice + model settings, MCP tool wiring (sanitized) + `dexter_session` metadata (type + user/guest info)

## Current Flow (Unauthenticated)
1. **Connect click**
   - `App.tsx` hooks call `fetchEphemeralKey`, hitting `GET /api/session` from the browser.
2. **Next.js API route**
   - `route.ts` fetches the Supabase session (via `createRouteHandlerClient`).
   - Authenticated users forward their Supabase access token to Dexter API; guests attach a demo profile descriptor.
   - On non-200 responses, we log `/api/session upstream` and bubble back a `502`.
3. **Sanitization**
   - Strip `tools` from the upstream payload; default the client to local MCP tooling.
   - Append an MCP reminder to the instructions.
   - Preserve the `dexter_session` block so the UI can display `guest` vs `user` state alongside Supabase auth status.
4. **Client bootstrap**
   - `useRealtimeSession` hands `client_secret` to the OpenAI WebRTC SDK.
   - SDK creates the peer connection, pulls audio, and starts the event stream.

```
Browser ──GET /api/session──▶ Next.js ──POST /realtime/sessions──▶ Dexter API ──▶ OpenAI
   │             │                     │
   │             │                     └─ verifies Supabase token (if provided) and tags session (guest/user)
   │             └─ forwards `{ model, supabaseAccessToken? }`
   └─────────────── ephemeral client_secret + dexter_session ◀────────────────────────────────┘
```

## Logging & Troubleshooting
- Success log: `/api/session ok { id, model, hasTools }` inside `logs/dexter-agents.log`.
- Failure log: `/api/session upstream { status, body }` when the Dexter API rejects the request.
- Quick health check: `curl -s http://localhost:3210/api/session` while tailing `npm run logs -- --nostream`.

## Identity Modes
| Mode | Trigger | Server Behaviour | UI Treatment |
| --- | --- | --- | --- |
| `user` | Supabase session + access token | Dexter API verifies the token, tags the session with user id/email, and keeps full tooling enabled. | Header shows account email; session chip shows the realtime user identity. |
| `guest` | No Supabase session or verification failure | Dexter API issues demo instructions, limits tooling, and returns `guest_profile` metadata. | Header still shows “Guest”; session chip displays the demo label with a prompt to sign in. |

> **Rate limiting:** guest mode is currently open but will be backed by a short-lived quota (Redis bucket) before launch so anonymous usage can’t drain credits.

## Reusing the Existing Supabase Auth
- Supabase cookies scoped to `.dexter.cash` automatically flow to `beta.dexter.cash`; no extra OAuth handshake is needed.
- The agents app now uses `createRouteHandlerClient` to read those cookies inside `/api/session` and forward the access token to Dexter API. The `/auth/callback` route keeps the cookies in sync with client-side auth state via `supabase.auth.onAuthStateChange`.
- Dexter API re-validates the token with Supabase (service role key) before tagging the realtime session as `user` and including email/id metadata.
- Guests skip the token and receive a shared demo profile; both paths coexist so anonymous demos work while logged-in users get full access.

## Checklist for Future Updates
- [x] Authenticated flow diagram (documented above with metadata callouts).
- [x] Document body fields forwarded to Dexter API (`supabaseAccessToken`, optional `guestProfile`).
- [ ] Wire guest session rate limiting (bucket + alerting) once Redis quota is finalised.
- [ ] Add reference to the eventual UI sign-in modal when it lands (currently using Twitter OAuth shortcut).

## Session Log Capture (October 5, 2025)
- The agents UI now records transcripts and MCP tool calls locally during each realtime session. When the connection closes or the page unloads, it posts a summary payload to `/api/realtime/logs`.
- That route proxies to the Dexter API’s `POST /api/realtime/logs`, forwarding Supabase/MCP auth so authenticated users receive summarised memories.
- Guest/demo runs still upload their logs for analytics, but the backend only injects memory context when a Supabase user id is present.
- Logging uses `navigator.sendBeacon` when possible, with a fetch fallback, so abandoned tabs still flush before unload.
- Metadata includes model/voice hints, the active agent name, MCP token state, and message/tool call counts, simplifying downstream summarisation.
