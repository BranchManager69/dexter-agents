# Coding Conventions

**Analysis Date:** 2026-01-28

## Naming Patterns

**Files:**
- Components: `PascalCase.tsx` (e.g., `AuthMenu.tsx`, `Transcript.tsx`)
- Hooks: `useFeatureName.ts` with `use` prefix (e.g., `useRealtimeSession.ts`)
- Utilities: `camelCase.ts` (e.g., `codecUtils.ts`, `emailProviders.ts`)
- API routes: `route.ts` in path-based directories
- CSS Modules: `ComponentName.module.css`

**Functions:**
- Hooks: `useFeatureName` (e.g., `useAuth`, `useRealtimeSession`)
- Event handlers: `handleEventName` (e.g., `handleSignOut`, `handleSendMagicLink`)
- Renderers: `renderSection` for internal JSX (e.g., `renderGuestContent`, `renderSignedInContent`)
- Formatters: `formatDataType` (e.g., `formatAddress`, `formatUsd`, `formatSolDisplay`)
- Normalizers: `normalizeDataType` (e.g., `normalizeOutput`, `normalizeBalancesPayload`)

**Variables:**
- React state: `camelCase` (e.g., `sessionStatus`, `userText`, `isModalOpen`)
- Refs: `camelCaseRef` (e.g., `sessionRef`, `transcriptRef`, `audioElementRef`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `DEFAULT_VAD_SETTINGS`, `MODERATION_CATEGORIES`)
- Booleans: `is`/`has`/`can` prefix (e.g., `isAuthenticated`, `hasConnectedOnce`, `canSend`)

**Types:**
- Interfaces: `PascalCase` with descriptive suffix (e.g., `AuthMenuProps`, `TranscriptItem`)
- Type aliases: `PascalCase` (e.g., `SessionStatus`, `DexterUserBadge`)
- Zod schemas: `PascalCaseZod` suffix (e.g., `GuardrailOutputZod`, `ModerationCategoryZod`)

## Code Style

**Formatting:**
- Tool: Prettier (implied by Next.js defaults)
- Indentation: 2 spaces
- Quotes: Double quotes for strings
- Semicolons: Yes
- Trailing commas: ES5 style (in arrays, objects)

**Linting:**
- Tool: ESLint with `eslint-config-next`
- Config: `eslint.config.mjs` (flat config format)
- Strict mode: Disabled (`"strict": false` in tsconfig)

**Line Length:**
- No strict limit enforced
- Practical limit ~120 characters for readability

## Component Patterns

**Function Components (standard):**
```typescript
interface ComponentNameProps {
  propA: string;
  propB?: number;
  onAction: () => void;
}

export function ComponentName({
  propA,
  propB,
  onAction,
}: ComponentNameProps) {
  // hooks at top
  const [state, setState] = useState(initialValue);
  const ref = useRef<HTMLDivElement | null>(null);

  // effects after hooks
  useEffect(() => {
    // effect logic
  }, [dependencies]);

  // handlers defined as arrow functions
  const handleClick = () => {
    onAction();
  };

  // render helpers for complex sections
  const renderSection = () => (
    <div>...</div>
  );

  return (
    <div ref={ref} className="...">
      {renderSection()}
    </div>
  );
}
```

**Props Interface Pattern:**
```typescript
// Inline interface above component
interface AuthMenuProps {
  isAuthenticated: boolean;
  loading: boolean;
  email: string | null;
  onSignIn: (email: string, captchaToken: string | null) => Promise<{ success: boolean; message: string }>;
  onSignOut: () => void;
  turnstileSiteKey?: string;  // optional props use ?
}
```

**Context Provider Pattern:**
```typescript
"use client";

import React, { createContext, useContext, useState, FC, PropsWithChildren } from "react";

type ContextValue = {
  items: Item[];
  addItem: (item: Item) => void;
};

const MyContext = createContext<ContextValue | undefined>(undefined);

export const MyProvider: FC<PropsWithChildren> = ({ children }) => {
  const [items, setItems] = useState<Item[]>([]);

  const addItem = (item: Item) => {
    setItems((prev) => [...prev, item]);
  };

  return (
    <MyContext.Provider value={{ items, addItem }}>
      {children}
    </MyContext.Provider>
  );
};

export function useMyContext() {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error("useMyContext must be used within MyProvider");
  }
  return context;
}
```

**Hook Pattern:**
```typescript
export interface HookCallbacks {
  onEvent?: (data: EventData) => void;
}

export function useFeatureName(callbacks: HookCallbacks = {}) {
  const [status, setStatus] = useState<Status>("idle");
  const ref = useRef<Resource | null>(null);

  const doAction = useCallback(async () => {
    // implementation
  }, [dependencies]);

  useEffect(() => {
    // setup/cleanup
    return () => {
      // cleanup
    };
  }, [dependencies]);

  return {
    status,
    doAction,
  } as const;
}
```

## API Route Patterns

**Standard GET Handler:**
```typescript
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createScopedLogger } from "@/server/logger";

type Database = any;  // Supabase types placeholder
const log = createScopedLogger({ scope: "api.feature.endpoint" });

export async function GET() {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const routeLog = log.child({ requestId, path: "/api/feature/endpoint", method: "GET" });

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>(
      { cookies: () => cookieStore },
      {
        supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      routeLog.warn({ event: "no_access_token", durationMs: Date.now() - startedAt });
      return NextResponse.json({ ok: false, error: "authentication_required" }, { status: 401 });
    }

    // Business logic here

    routeLog.info({ event: "success", durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    routeLog.error({
      event: "handler_exception",
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
    });
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
```

**Response Patterns:**
```typescript
// Success
return NextResponse.json({ ok: true, data: payload });
return NextResponse.json(data);  // when ok field not needed

// Client error
return NextResponse.json({ ok: false, error: "validation_error" }, { status: 400 });
return NextResponse.json({ ok: false, error: "authentication_required" }, { status: 401 });

// Server error
return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
return NextResponse.json({ ok: false, error: "upstream_failure", status: 502 });
```

## Error Handling Patterns

**Try-Catch with Logging:**
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  routeLog.error({
    event: "operation_failed",
    error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
  });
  return NextResponse.json({ ok: false, error: "operation_failed" }, { status: 500 });
}
```

**Async Cleanup Pattern:**
```typescript
useEffect(() => {
  let cancelled = false;

  async function fetchData() {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = await response.json();
      if (!cancelled) {
        setData(data);
      }
    } catch (error) {
      if (!cancelled) {
        console.warn("Fetch failed", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      }
    }
  }

  fetchData();

  return () => {
    cancelled = true;
  };
}, [url]);
```

**Optional Chaining for Safe Access:**
```typescript
const email = authSession?.user?.email ?? null;
const roles = data?.user?.roles ?? [];
const value = response?.data?.result ?? defaultValue;
```

**Error Boundaries:**
- Not explicitly used; rely on Next.js error handling
- API routes wrap in try-catch with logging

## Logging Patterns

**Server-Side (pino):**
```typescript
import { createScopedLogger } from "@/server/logger";

const log = createScopedLogger({ scope: "api.feature" });

// Child logger for request context
const routeLog = log.child({ requestId, path, method });

// Log levels
routeLog.debug({ event: "verbose_info" }, "Debug message");
routeLog.info({ event: "success", durationMs }, "Operation completed");
routeLog.warn({ event: "fallback_used" }, "Using fallback value");
routeLog.error({ event: "failure", error }, "Operation failed");
```

**Client-Side (console with guards):**
```typescript
// Development-only logging
if (process.env.NODE_ENV !== "production") {
  console.debug("[realtime transport]", event);
}

// Feature-flagged debug logging
if (process.env.NEXT_PUBLIC_DEBUG_TRANSCRIPT === "true") {
  console.info("[dexter transcription]", payload);
}

// Warning for non-critical issues
console.warn("Failed to fetch active wallet", error);

// Error for failures
console.error("Error connecting via SDK:", err);
```

**Structured Event Logging:**
```typescript
// In hooks/contexts
logClientEvent({ type: "client.action", data }, "(description)");
logServerEvent(event, "event_type");
```

## Import Organization

**Order:**
1. React imports
2. Node built-ins (`node:crypto`, `node:path`)
3. Next.js imports (`next/...`)
4. External packages (`@openai/...`, `@supabase/...`, `zod`, etc.)
5. Internal absolute imports (`@/app/...`, `@/server/...`)
6. Relative imports (`./`, `../`)
7. Type-only imports (can be mixed with above)

**Example:**
```typescript
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { useSearchParams } from "next/navigation";
import type { RealtimeAgent } from "@openai/agents/realtime";
import { z } from "zod";

import { useAuth } from "@/app/auth-context";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { createScopedLogger } from "@/server/logger";
import type { SessionStatus, TranscriptItem } from "@/app/types";

import { ChildComponent } from "./ChildComponent";
import styles from "./Component.module.css";
```

**Path Aliases:**
```typescript
// Use @/* alias for all src imports
import { useAuth } from "@/app/auth-context";  // ✓
import { useAuth } from "../../../auth-context";  // ✗ Avoid deep relative paths
```

## Type Patterns

**Union Types for Status:**
```typescript
export type SessionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";
```

**Const Arrays with Derived Types:**
```typescript
export const MODERATION_CATEGORIES = ["OFFENSIVE", "OFF_BRAND", "VIOLENCE", "NONE"] as const;
export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];
export const ModerationCategoryZod = z.enum([...MODERATION_CATEGORIES]);
```

**Interface for Complex Objects:**
```typescript
export interface TranscriptItem {
  itemId: string;
  type: "MESSAGE" | "BREADCRUMB" | "TOOL_NOTE";
  role?: "user" | "assistant";
  title?: string;
  data?: Record<string, any>;
  expanded: boolean;
  timestamp: string;
  createdAtMs: number;
  status: "IN_PROGRESS" | "DONE";
  isHidden: boolean;
}
```

**Record Types for Maps:**
```typescript
const TOOL_NOTE_RENDERERS: Record<string, ToolNoteRenderer> = {
  pumpstream_live_summary: pumpstreamRenderer,
  resolve_wallet: resolveWalletRenderer,
};
```

## Styling Conventions

**Tailwind Utility Classes:**
```typescript
// Use template literals for conditional classes
className={`flex items-center gap-2 ${isActive ? "bg-white/10" : "bg-transparent"}`}

// Or array join for complex conditionals
className={[
  "px-6 py-4",
  heroCollapsed ? "py-3" : "py-7",
  "transition-all duration-500",
].join(" ")}
```

**CSS Module Classes:**
```typescript
import styles from "./Component.module.css";

// Apply via styles object
<div className={styles.container}>
  <button className={`${styles.button} ${styles.buttonPrimary}`}>
```

**Design Token Usage:**
```typescript
// Use semantic tokens over raw colors
className="bg-surface-base text-foreground border-subtle"  // ✓
className="bg-[#0A0A0A] text-white border-gray-800"        // ✗ Avoid raw values

// Spacing tokens
className="gap-2 p-4 mt-6"  // Use Tailwind defaults

// Typography
className="font-display text-sm font-semibold tracking-[0.08em]"
```

## Comments

**When to Comment:**
- Complex business logic that isn't self-evident
- Workarounds or hacks with TODO references
- API/transport event handling switches

**JSDoc for Exported Types:**
```typescript
export interface AgentConfig {
  name: string;
  publicDescription: string; // gives context to agent transfer tool
  instructions: string;
  tools: Tool[];
  // addTranscriptBreadcrumb is a param in case we want to add additional breadcrumbs
  toolLogic?: Record<string, (...) => Promise<any>>;
}
```

**Inline Comments:**
```typescript
// Ensure user voice messages show up immediately when items are created
case "conversation.item.created": {
  // ...
}

// The OpenAI Realtime API no longer accepts an arbitrary `context` payload,
// so we avoid attaching it to prevent 400 Unknown parameter errors.
automaticallyTriggerResponseForMcpToolCalls: true,
```

## Function Design

**Size:**
- Hooks can be large (~hundreds of lines) when orchestrating complex state
- Utility functions: Keep under 50 lines
- Render functions: Break into `renderSection` helpers when > 50 lines

**Parameters:**
- Use object params for 3+ parameters
- Provide defaults for optional params: `function fn(callbacks: Callbacks = {})`
- Destructure props in function signature

**Return Values:**
- Hooks: Return object with `as const` for immutable shape
- Handlers: Return `Promise<void>` or `Promise<Result>`
- Utilities: Return specific types, use `| undefined` for missing values

## Module Design

**Exports:**
- Prefer named exports for all non-page files
- Default exports only for `page.tsx`, `layout.tsx`, `not-found.tsx`
- Re-export types alongside implementations

**Barrel Files:**
- Use for renderer registries and scenario loaders
- Keep shallow (one level of re-export)
- Include type re-exports

---

*Convention analysis: 2026-01-28*
