# Codebase Structure

**Analysis Date:** 2026-01-28

## Directory Layout

```
dexter-agents/
├── src/
│   ├── app/                    # Next.js App Router root
│   │   ├── api/                # API route handlers
│   │   ├── agentConfigs/       # Agent definitions & prompts
│   │   ├── auth/               # Auth callback routes
│   │   ├── components/         # React UI components
│   │   ├── config/             # Runtime configuration
│   │   ├── contexts/           # React Context providers
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utility functions
│   │   ├── state/              # Non-React stores
│   │   ├── super-admin/        # Admin dashboard page
│   │   ├── tools/              # Tools page
│   │   ├── page.tsx            # Main page (/)
│   │   ├── layout.tsx          # Root layout
│   │   ├── providers.tsx       # Context provider composition
│   │   └── types.ts            # Shared TypeScript types
│   ├── server/                 # Server-only utilities
│   ├── theme/                  # Theme/palette definitions
│   ├── toolnote-stories/       # Ladle component stories
│   └── instrumentation.ts      # Next.js instrumentation
├── scripts/                    # CLI tools and harnesses
├── prisma/                     # Database migrations
├── public/                     # Static assets
└── [config files]              # next.config.ts, tailwind.config.ts, etc.
```

## Directory Purposes

**`src/app/api/`:**
- Purpose: Next.js Route Handlers (server-side endpoints)
- Contains: `route.ts` files organized by resource
- Key files:
  - `session/route.ts` - Ephemeral key generation for Realtime sessions
  - `mcp/route.ts` - MCP tool proxy (GET: list tools, POST: call tool)
  - `mcp/auth.ts` - MCP authentication resolution
  - `realtime/sessions/[sessionId]/route.ts` - Session management
  - `prompt-profiles/` - CRUD for agent personas

**`src/app/agentConfigs/`:**
- Purpose: Agent persona definitions, prompt profiles, tool configurations
- Contains: TypeScript modules exporting agent loaders
- Key files:
  - `index.ts` - Scenario loader registry
  - `customerServiceRetail/` - "Dexter Trading" scenario
  - `customerServiceRetail/concierge.ts` - Main agent builder
  - `customerServiceRetail/promptProfile.ts` - Prompt resolution
  - `guardrails.ts` - Output moderation guardrail

**`src/app/components/`:**
- Purpose: React UI components
- Contains: TSX files, CSS modules
- Key files:
  - `DexterAppLayout.tsx` - Main layout compositor
  - `shell/DexterShell.tsx` - Page shell with slots
  - `shell/TopRibbon.tsx` - Header with auth UI
  - `shell/BottomStatusRail.tsx` - Footer status bar
  - `TranscriptMessages.tsx` - Chat message list
  - `InputBar.tsx` - Text/attachment composer
  - `toolNotes/` - Tool output renderers
  - `signals/` - Admin signal panels
  - `wallet/` - Wallet export UI

**`src/app/hooks/`:**
- Purpose: Custom React hooks for business logic
- Contains: TypeScript files with `use*` naming
- Key files:
  - `useDexterAppController.ts` - Main orchestration hook (~2800 lines)
  - `useRealtimeSession.ts` - WebRTC session management
  - `useHandleSessionHistory.ts` - Transcript event processing
  - `usePromptProfiles.ts` - Agent persona CRUD
  - `useSignalData.ts` - Admin signal aggregation
  - `useToolCatalog.ts` - MCP tool listing

**`src/app/contexts/`:**
- Purpose: React Context providers for global state
- Contains: `*Context.tsx` files
- Key files:
  - `TranscriptContext.tsx` - Chat transcript state
  - `EventContext.tsx` - Debug event log

**`src/app/config/`:**
- Purpose: Runtime configuration constants
- Contains: TypeScript config modules
- Key files:
  - `env.ts` - Environment variable accessors
  - `models.ts` - Model IDs for OpenAI
  - `vad.ts` - VAD default settings
  - `memory.ts` - Memory/context settings

**`src/app/lib/`:**
- Purpose: Shared utility functions
- Contains: TypeScript modules
- Key files:
  - `codecUtils.ts` - Audio codec helpers
  - `promptModules.ts` - Prompt fetching from Dexter API
  - `markdown/solanaArtifacts.ts` - Solana address detection plugin
  - `wallet/keyFormat.ts` - Wallet key formatting

**`src/app/state/`:**
- Purpose: Non-React state stores
- Contains: Pub-sub style stores
- Key files:
  - `mcpStatusStore.ts` - MCP connection status (simple observable)

**`src/server/`:**
- Purpose: Server-only code (not bundled for client)
- Contains: Logging utilities
- Key files:
  - `logger.ts` - Scoped logger factory

**`scripts/`:**
- Purpose: CLI tools, testing harnesses, development utilities
- Contains: JavaScript/TypeScript scripts
- Key files:
  - `dexchat.js` - Playwright harness CLI
  - `runHarness.js` - Harness execution engine
  - `lib/harnessCommon.js` - Shared harness utilities

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Main page (wraps App in Suspense)
- `src/app/App.tsx`: App component (calls controller hook)
- `src/app/layout.tsx`: Root layout (applies providers)
- `src/instrumentation.ts`: Next.js startup hooks

**Configuration:**
- `src/app/config/env.ts`: Environment variables
- `src/app/config/models.ts`: OpenAI model IDs
- `next.config.ts`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript configuration

**Core Logic:**
- `src/app/hooks/useDexterAppController.ts`: Main state orchestrator
- `src/app/hooks/useRealtimeSession.ts`: WebRTC session
- `src/app/hooks/useHandleSessionHistory.ts`: Event processing
- `src/app/api/mcp/auth.ts`: MCP authentication

**Testing:**
- `src/toolnote-stories/`: Ladle story files
- `scripts/runHarness.js`: E2E harness
- `ladle.vite.config.mjs`: Ladle (Storybook alt) config

## Naming Conventions

**Files:**
- Components: PascalCase (`TranscriptMessages.tsx`)
- Hooks: camelCase with `use` prefix (`useRealtimeSession.ts`)
- API routes: `route.ts` in nested directories
- CSS modules: `.module.css` suffix
- Types: `types.ts` in relevant directory
- Index exports: `index.ts` or `index.tsx`

**Directories:**
- Feature groupings: kebab-case (`tool-notes/` → `toolNotes/` mixed)
- API resources: kebab-case (`prompt-profiles/`)
- Dynamic routes: brackets (`[sessionId]/`)

**Code:**
- Components: PascalCase (`DexterShell`)
- Hooks: camelCase with `use` prefix (`useAuth`)
- Context: PascalCase with `Context`/`Provider` suffix
- Types: PascalCase (`TranscriptItem`, `SessionStatus`)
- Constants: UPPER_SNAKE_CASE (`MODEL_IDS`, `MODERATION_CATEGORIES`)

## Where to Add New Code

**New MCP Tool Renderer:**
1. Create renderer in `src/app/components/toolNotes/renderers/[toolName].tsx`
2. Export from `src/app/components/toolNotes/renderers/index.tsx`
3. Add to `TOOL_NOTE_RENDERERS` registry

**New API Endpoint:**
1. Create directory under `src/app/api/[resource]/`
2. Add `route.ts` with exported HTTP method handlers
3. Use `createScopedLogger()` for consistent logging

**New Hook:**
1. Create `src/app/hooks/use[Name].ts`
2. Follow existing patterns for error handling
3. Export from hook file (no barrel file for hooks)

**New Context:**
1. Create `src/app/contexts/[Name]Context.tsx`
2. Export provider and `use[Name]` hook
3. Add to `src/app/providers.tsx` composition

**New Agent Persona:**
1. Add profile to `src/app/agentConfigs/customerServiceRetail/promptProfile.ts`
2. Register scenario loader in `src/app/agentConfigs/index.ts`

**New Component:**
1. Create in appropriate `src/app/components/[category]/` directory
2. Co-locate CSS module if needed (`.module.css`)
3. Export default from component file

## Special Directories

**`prisma/migrations/`:**
- Purpose: Database schema migrations
- Generated: Yes (by Prisma)
- Committed: Yes

**`public/`:**
- Purpose: Static assets served at `/`
- Generated: No
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning documents
- Generated: By planning process
- Committed: Optional (typically yes)

**`scripts/lib/`:**
- Purpose: Shared harness utilities
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-01-28*
