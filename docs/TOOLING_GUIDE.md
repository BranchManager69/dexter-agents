# MCP Tool Wiring Playbook

This is the checklist for keeping every Dexter surface in sync whenever we add, rename, or debug MCP tools. The same flow works for concierge, trader, markets, or any other persona.

---

## 1. MCP server (source of truth)

1. **Register the tool** in `dexter-mcp/toolsets/<area>/index.mjs` (or add a new toolset entry in `toolsets/index.mjs`).
2. **Implement the handler** (respect the existing schema + return shape).
3. **Keep `TOKEN_AI_MCP_TOOLSETS` in mind**: if the toolset name is filtered out, the tool never loads.
4. **Session assets**: some toolsets (twitter, stream) require external files (`TWITTER_SESSION_PATH`, etc.). Refresh them when they expire.

✅ Once the tool is live here, `dexter-mcp` will report it via `registerSelectedToolsets()` and `/listTools`.

---

## 2. dexter-api (persona definitions)

1. Edit `dexter-api/src/promptProfiles.ts`.
2. Under the relevant profile (`toolDescriptions`), add the slug:
   ```ts
   new_tool: {
     slug: 'agent.concierge.tool.new_tool',
     fallback: missingPromptFallback('agent.concierge.tool.new_tool'),
   },
   ```
3. If you are seeding a profile through the API (e.g. `POST /api/prompt-profiles`), include the new slug in that request’s `toolSlugs` map. The default definition in `promptProfiles.ts` does not declare `toolSlugs`; it relies entirely on `toolDescriptions`, so new slugs land automatically when the resolved profile is stored.

Why: the API resolved profile is what the client fetches. If it’s missing here, no persona (web or voice) will talk about the tool.

---

## 3. dexter-agents (web concierge client)

Three places to keep in sync:

1. `src/app/hooks/usePromptProfiles.ts` – add to `DEFAULT_TOOL_SLUGS`.
2. `src/app/agentConfigs/customerServiceRetail/promptProfile.ts` – add to `toolDescriptions`.
3. `src/app/agentConfigs/customerServiceRetail/tools.ts` – add a proxy in `createConciergeToolset()` that calls `callMcp('<tool_name>', input)`.

This ensures brand-new or reset concierge profiles still expose the full catalog even before the API responds.

Optional extras:
- Tool-note renderer: `src/app/components/toolNotes/renderers/` + `renderers/index.ts`.
- Transcript styling: confirm renderers use the shared primitives in `toolNotes/solanaVisuals.tsx`.
- Role-locked tools (Codex, stream controls, etc.) still require the caller to satisfy backend gating (`ensureSuperAdmin`, `ensureProAccess`). If the bearer lacks those scopes, MCP will list the tools but the proxy endpoints will reject execution.

---

## 4. Inventory & sanity checks

Run the audit script from repo root to see every tool’s coverage:

```bash
node scripts/audit-tool-slugs.mjs
```

Output columns:

| Column | Meaning |
| -- | -- |
| `mcp` | Registered inside `dexter-mcp`. |
| `default slug` | Present in `DEFAULT_TOOL_SLUGS`. |
| `concierge-profile` | Present in the default concierge `toolDescriptions`. |
| `concierge-toolset` | Client proxy exists in `createConciergeToolset`. |
| `api-profile` | dexter-api prompt profile includes the tool. |

All `✓` means the tool is wired everywhere. Use it before/after refactors.

---

## 5. Deployment quick hits

1. After edits in `dexter-agents`:
   ```bash
   npm run build
   pm2 restart dexter-agents --update-env
   ```
2. After MCP changes: rebuild/restart the MCP process (`pm2 restart dexter-mcp` or your preferred script).
3. After API changes: redeploy or restart `dexter-api`.

---

## 6. When things go sideways

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Tool never appears in logs | Missing slug/toolset entry (client or API) | Run `audit-tool-slugs`, patch missing column(s). |
| Tool returns “not allowed” | MCP toolset not loaded (`TOKEN_AI_MCP_TOOLSETS`) or caps imposed by `MCP_ALLOWED_TOOLS_*` env | Update env and restart API/MCP. |
| Twitter search fails immediately | Expired session file at `TWITTER_SESSION_PATH` | Rerun desktop refresh helper + `npm run dexchat:refresh`. |
| Rendered note looks broken | Renderer missing or outdated | Add/update renderer in `toolNotes/renderers`. |

---

## 7. Current tool catalog (MCP)

| Group | Tools |
| --- | --- |
| Wallet | `resolve_wallet`, `list_my_wallets`, `set_session_wallet_override`, `auth_info` |
| Solana | `solana_resolve_token`, `solana_list_balances`, `solana_swap_preview`, `solana_swap_execute` |
| Markets | `markets_fetch_ohlcv` |
| Pumpstream | `pumpstream_live_summary` |
| Twitter | `twitter_search` |
| Codex | `codex_start`, `codex_reply`, `codex_exec` |
| Stream | `stream_get_scene`, `stream_set_scene` |
| General web | `search`, `fetch` |

Keep this table as the baseline when adding more tooling.

---

### TL;DR workflow

1. Register tool in MCP.
2. Add slug + fallback in `dexter-api` profiles.
3. Update concierge defaults (`DEFAULT_TOOL_SLUGS`, `toolDescriptions`, `createConciergeToolset`).
4. (Optional) create renderer.
5. Run `node scripts/audit-tool-slugs.mjs`.
6. Rebuild/restart relevant services.

Do that every time and nothing falls through the cracks again.
