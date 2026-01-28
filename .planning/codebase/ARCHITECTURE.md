# Architecture

**Analysis Date:** 2026-01-28

## Pattern Overview

**Overall:** Next.js 14+ App Router + OpenAI Realtime Voice Agent

**Key Characteristics:**
- Single-page voice-first application with realtime crypto trading capabilities
- WebRTC-based bidirectional audio streaming via OpenAI Realtime API
- Tool execution through MCP (Model Context Protocol) backend integration
- Multi-provider authentication with Supabase (magic link, Twitter OAuth, wallet)
- Layered state management: React Context (auth, transcript, events) + custom stores (MCP status)

## Layers

**Presentation Layer:**
- Purpose: UI components and visual rendering
- Location: `src/app/components/`
- Contains: React components (TSX), CSS modules, Framer Motion animations
- Depends on: React Context, custom hooks
- Used by: Page components

**Application Layer (Hooks):**
- Purpose: Business logic, state orchestration, side effects
- Location: `src/app/hooks/`
- Contains: Custom React hooks that manage complex state and API interactions
- Depends on: React Context, API routes, external services
- Used by: `src/app/page.tsx` via `useDexterAppController`

**Context Layer:**
- Purpose: Global state management for cross-cutting concerns
- Location: `src/app/contexts/`, `src/app/auth-context.tsx`, `src/app/state/`
- Contains: React Context providers, pub-sub stores
- Depends on: Supabase SDK, browser APIs
- Used by: All client components via hooks

**API Layer:**
- Purpose: Server-side request handling, upstream service proxying
- Location: `src/app/api/`
- Contains: Next.js Route Handlers (GET/POST/DELETE)
- Depends on: Dexter API, Supabase Auth, MCP server
- Used by: Client-side fetch calls

**Agent Configuration Layer:**
- Purpose: Define agent personas, tools, and prompt profiles
- Location: `src/app/agentConfigs/`
- Contains: Agent definitions, prompt resolution, tool specifications
- Depends on: Prompt module service (fetched from Dexter API)
- Used by: Realtime session initialization

## Data Flow

**Voice Session Lifecycle:**

```
User clicks "Start" → useDexterAppController.connectToRealtime()
       │
       ▼
/api/session (GET) → fetches ephemeral key from Dexter API
       │
       ▼
useRealtimeSession.connect() → OpenAI Realtime SDK WebRTC handshake
       │
       ▼
Audio streams bidirectionally; server VAD detects speech
       │
       ▼
OpenAI transcribes → emits events → useHandleSessionHistory processes
       │
       ▼
MCP tool calls execute server-side → results stream back
       │
       ▼
TranscriptContext updates → UI re-renders messages/tool notes
```

**MCP Tool Execution:**

1. OpenAI Realtime model decides to call a tool
2. `response.output_item.added` event with `type: 'mcp_call'`
3. Backend (Dexter API) executes tool using minted JWT
4. `response.mcp_call.completed` returns result
5. `useHandleSessionHistory.handleMcpToolCallCompleted()` updates transcript
6. Tool note renderer (`src/app/components/toolNotes/renderers/`) displays result

**Authentication Flow:**

```
Browser loads → AuthProvider.bootstrap()
       │
       ▼
Fetch /auth/config → get Supabase URL + anon key
       │
       ▼
createClient() → getSession() → check for existing session
       │
       ▼
onAuthStateChange listener → POST /auth/callback to sync cookies
       │
       ▼
Session propagates via AuthContext → useAuth() everywhere
```

**State Management:**

- **AuthContext:** Supabase session, sign-in/out methods, Turnstile token
- **TranscriptContext:** Chat messages, tool notes, breadcrumbs (in-memory array)
- **EventContext:** Debug event log (client/server events for admin inspection)
- **mcpStatusStore:** Simple pub-sub for MCP connection state (not React Context)
- **useDexterAppController:** Orchestrates all above into props for `DexterAppLayout`

## Key Abstractions

**TranscriptItem:**
- Purpose: Unified representation of conversation entries
- Examples: `src/app/types.ts` (line 72-84)
- Pattern: Discriminated union (`type: "MESSAGE" | "BREADCRUMB" | "TOOL_NOTE"`)

**RealtimeSession:**
- Purpose: WebRTC connection to OpenAI Realtime API
- Examples: `src/app/hooks/useRealtimeSession.ts`
- Pattern: Wrapper around `@openai/agents/realtime` SDK with event handlers

**ResolvedConciergeProfile:**
- Purpose: Fully-resolved agent configuration with prompt text
- Examples: `src/app/agentConfigs/customerServiceRetail/promptProfile.ts`
- Pattern: Async resolution of prompt slugs from Dexter API

**ToolNoteRenderer:**
- Purpose: Custom visual rendering for specific MCP tool outputs
- Examples: `src/app/components/toolNotes/renderers/index.tsx`
- Pattern: Registry mapping tool names to React components

## Entry Points

**Main Page:**
- Location: `src/app/page.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Wraps `<App />` in Suspense boundary

**App Component:**
- Location: `src/app/App.tsx`
- Triggers: Rendered by page.tsx
- Responsibilities: Calls `useDexterAppController()`, passes props to `DexterAppLayout`

**Session API:**
- Location: `src/app/api/session/route.ts`
- Triggers: Client GET request to initiate voice session
- Responsibilities: Authenticates user, fetches ephemeral key from Dexter API

**MCP Proxy:**
- Location: `src/app/api/mcp/route.ts`
- Triggers: Client calls to execute MCP tools
- Responsibilities: Resolves auth, connects to MCP server, forwards tool calls

## Error Handling

**Strategy:** Graceful degradation with user feedback

**Patterns:**
- API routes return structured JSON errors with status codes
- Hooks catch errors and update status state (e.g., `setSessionStatus("ERROR")`)
- Transcript breadcrumbs surface errors to admins (`addTranscriptBreadcrumb`)
- Server-side scoped logger (`src/server/logger.ts`) with structured logging

## Cross-Cutting Concerns

**Logging:**
- Server: `createScopedLogger()` from `@/server/logger` with request ID correlation
- Client: `logClientEvent()` / `logServerEvent()` via EventContext for debug UI
- Transcription debug: Beacon to `/api/transcription-debug` when enabled

**Validation:**
- Zod schemas for guardrail outputs (`GuardrailOutputZod` in `src/app/types.ts`)
- Runtime type checks in hooks for event payloads

**Authentication:**
- Supabase session cookies + optional Bearer token in Authorization header
- MCP auth resolved via `resolveMcpAuth()` in `src/app/api/mcp/auth.ts`
- Role-based access control (`isSuperAdmin`, `hasProAccess`) in `useDexterAppController`

## Realtime/Voice Architecture

**Transport:**
- `OpenAIRealtimeWebRTC` from `@openai/agents/realtime` SDK
- Codec selection via `?codec=` query param (opus default, g711_ulaw/g711_alaw for PSTN sim)
- Audio element created dynamically for playback

**Voice Activity Detection (VAD):**
- Server-side VAD with configurable threshold, prefix padding, silence duration
- Settings persisted to localStorage (`dexter:vadSettings`)
- Auto-respond toggle controls whether VAD triggers immediate response

**Transcription:**
- Real-time ASR via `input_audio_transcription` events
- Delta streaming updates transcript incrementally
- Completed events finalize message text

**Guardrails:**
- Output moderation via `createModerationGuardrail()` in `src/app/agentConfigs/guardrails.ts`
- Categories: `OFFENSIVE`, `OFF_BRAND`, `VIOLENCE`, `NONE`
- Tripped guardrails update transcript item with rationale

---

*Architecture analysis: 2026-01-28*
