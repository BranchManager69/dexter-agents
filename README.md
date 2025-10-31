<p align="center">
  <img src="./public/wordmarks/dexter-wordmark.svg" alt="Dexter wordmark" width="360">
</p>

<h1 align="center">Dexter Voice</h1>

<p align="center">
  <a href="https://github.com/BranchManager69/dexter-api">Dexter API</a>
  · <a href="https://github.com/BranchManager69/dexter-fe">Dexter FE</a>
  · <strong>Dexter Voice</strong>
  · <a href="https://github.com/BranchManager69/dexter-mcp">Dexter MCP</a>
  · <a href="https://github.com/BranchManager69/dexter-ops">Dexter Ops</a>
</p>

<p align="center">
  <a href="https://nodejs.org/en/download"><img src="https://img.shields.io/badge/node-%3E=20-green.svg" alt="Node >= 20"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/framework-Next.js%2015-black.svg" alt="Next.js 15"></a>
  <a href="https://github.com/openai/openai-agents-js"><img src="https://img.shields.io/badge/openai-agents-blue.svg" alt="OpenAI Agents"></a>
</p>

Dexter Voice is the production interface for Dexter’s realtime agents. It blends OpenAI Realtime + Agents, the Dexter MCP tool graph, and Supabase identity into a voice-first console that operators use to triage requests, pull on-chain data, settle trades, and route conversations between specialized personas. The same codebase ships our public demo, internal ops cockpit, and the Playwright harness that regression-tests every scenario before an on-chain change ships.

---

## Core Capabilities
- **Voice-native operator console** – realtime WebRTC surface with speech recognition, guardrails, and transcript metrics so agents can work heads‑up.
- **Solana-first execution** – wallet diagnostics, swap previews, and trade execution run on managed wallets pulled from Dexter MCP, with signature provenance surfaced directly in the UI.
- **x402 micropayment enforcement** – every tool call and session is metered through Dexter API’s x402 billing pipeline so premium flows stay on-chain-auditable.
- **Scenario routing & handoffs** – configurable agent graphs escalate between customer support, concierge, trading, and human SIM personas while preserving context.
- **Observable tool orchestration** – MCP-backed tool notes render structured responses (wallet balances, pumpstream intel, Tavily research) without exposing credentials to the browser.
- **Playwright harness baked in** – the `dexchat` CLI launches full speech sessions to validate flows, regenerate Supabase storage state, and capture artifacts for CI.
- **Ops-ready deployment** – PM2 + nginx templates from `dexter-ops` keep the voice surface in lockstep with API and MCP releases.

## Architecture at a Glance
1. **Dexter Voice (this repo)** hosts the Next.js 15 interface, realtime WebRTC bridge, and scenario logic.
2. **Dexter API** issues short-lived Realtime tokens, mints wallet JWTs, and tallies x402 micropayments for every tool invocation.
3. **Dexter MCP** exposes the Solana + research tool graph (wallet management, Jupiter swaps, pumpstream, Tavily search) consumed by the voice agent.
4. **Supabase** keeps user identity, managed wallet assignments, and role gating in sync across sessions.

The result is a governed agent console: operators speak to a realtime supervisor model, which delegates work across MCP tools while the API enforces quotas and debits x402 usage. The same harness CLI (`dexchat`) used by QA and CI replays these sessions end-to-end so each deploy ships with verifiable transcripts.

## Why Teams Use Dexter Voice
- **24/7 Solana trading desk** – stand up an always-on conversational agent that can inspect wallets, stage swaps, and hand off to humans with full transcript context.
- **Governed experimentation** – prototype new MCP tools or prompts while x402 metering keeps premium flows accountable to finance and compliance teams.
- **Operator augmentation** – headset operators get real-time transcripts, guardrail alerts, and tool telemetry without touching dashboard tabs.
- **Hackathon-ready demos** – the same flows showcased in the Colosseum entry run locally with a single `npm run dev`, so judges and partners see the production stack.

## Dexter Stack

| Repo | Role |
|------|------|
| [`dexter-api`](https://github.com/BranchManager69/dexter-api) | Issues realtime tokens, proxies MCP tools, settles x402 billing |
| [`dexter-fe`](https://github.com/BranchManager69/dexter-fe) | Browser client for production voice + chat surfaces |
| **`dexter-agents` (Dexter Voice)** | Voice interface + regression harness orchestrating MCP tools under x402 governance |
| [`dexter-mcp`](https://github.com/BranchManager69/dexter-mcp) | Managed MCP transport exposing wallet + trading tools |
| [`dexter-ops`](https://github.com/BranchManager69/dexter-ops) | Shared ops playbook, PM2 config, nginx templates |

Keep the repos cloned as siblings (for example under `/home/branchmanager/websites/`) so shared env loaders and PM2 scripts work without tweaks.

## Quick Start

```bash
git clone https://github.com/BranchManager69/dexter-agents.git
cd dexter-agents
npm ci
cp .env.sample .env   # populate keys described below
npm run dev           # http://localhost:3211 by default (0.0.0.0:3211)
```

The dev server hot-reloads agent configs and tool logic. Use the Scenario dropdown to swap between demo flows. Pass `-- --port <port>` if you prefer the classic `3000`.

## Environment
- `.env.sample` documents required variables (`OPENAI_API_KEY`, `NEXT_PUBLIC_OPENAI_*_MODEL`, `NEXT_PUBLIC_SITE_URL`).
- **Supabase** – set `NEXT_PUBLIC_SUPABASE_URL` for client fetches and keep `SUPABASE_ANON_KEY` server-side; the `/auth/config` proxy hands the anon key to the browser when needed.
- **Cloudflare Turnstile** – set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (same value the main site uses) to render the security challenge before sending a magic link.
- **x402 micropayments** – keep `NEXT_PUBLIC_DEXTER_API_ORIGIN` aligned with your `dexter-api` deployment; that service tallies x402 usage for each tool call surfaced in the UI.
- Set `TOKEN_AI_MCP_TOKEN` for local MCP tool runs (or `HARNESS_MCP_TOKEN` when using the harness CLI); production keeps it in PM2 env so MCP connectors stay gated.
- When deployed through `dexter-ops/ops/ecosystem.config.cjs`, `npm run deploy` builds the app and restarts the PM2 process with updated env.

### Supabase Redirect Allowlist
Add the beta surface to the Supabase project so magic links return to the correct domain:

1. Supabase Dashboard → **Authentication → URL Configuration**
2. Set **Site URL** to `https://dexter.cash`
3. Under **Redirect URLs** include each surface you care about (e.g. `https://beta.dexter.cash`, `https://dexter.cash`, optionally `https://*.dexter.cash`)
4. Save, then request a fresh magic link so the new redirect is used

## Project Layout
- `src/app/App.tsx` – realtime UI state machine (transcript, guardrails, tool results).
- `src/app/agentConfigs/` – scenario definitions; register new configs in `index.ts`.
- `src/app/tools/` – tool logic invoked by agents (keep names aligned with MCP counterparts).
- `src/app/components/`, `hooks/`, `contexts/` – reusable UI/state primitives.
- `scripts/` – `dexchat.js` CLI and `runHarness.js` Playwright runner; artifacts land in `harness-results/` (git-ignored).
- `AGENTS.md` – contributor guidelines covering style, testing, and PR expectations.
- Internal diagrams and extended walkthroughs live in the private Dexter docs workspace; contact the team for access.

## Tool Note Renderers
- **Shared primitives** – `src/app/components/toolNotes/solanaVisuals.tsx` exports the icon, metric pill, and token flow components used across every renderer (not only Solana tools). Reach for these instead of re-creating bespoke badge layouts.
- **Search & fetch** – the `search` and `fetch` notes now consume Tavily responses (web search + extraction). Results include structured snippets, favicons, and the source domain; the cards render as single-line links so users can click anywhere to open the page.
- **Wallet & pumpstream** – wallet notes show copyable `HashBadge`s for mints/accounts, while the pumpstream renderer collapses market cap + momentum into one compact row and links the preview card directly to the stream.
- **Solana artifacts in markdown** – addresses and signatures inside agent transcripts are replaced with clickable badges via the `solanaArtifactsRemarkPlugin`. When editing markdown-rendered output, leave the base58 strings intact—the plugin handles classification automatically.

## Agent Scenarios
- **chatSupervisor** – realtime agent greets and triages while a supervisor model executes complex tool calls.
- **customerServiceRetail** – sequential handoff flow moving between authentication, returns, sales, and human SIM.
- **dexterTrading** – example trading assistant tuned for Dexter’s wallets and data sources.

Create new scenarios by copying an existing folder, wiring it into `agentConfigs/index.ts`, and updating presets under `src/app/config/`.

## Harness & Testing
- `npm run dexchat -- --prompt "Smoke" --url http://localhost:3000` runs a local Playwright smoke test and saves a JSON artifact to `harness-results/`.
- `dexchat --prompt "Provide trading intel" --headful` (after `npm link`) opens a headed browser for manual observation.
- Harness captures include Supabase auth status, MCP transcripts, and the x402 ledger entries returned by `dexter-api`; store notable runs alongside PRs or link to diffs when behavior changes.

## Scripts
- `npm run dev` – Next.js dev server on port 3000.
- `npm run build` – production bundle used by PM2 and `npm run deploy`.
- `npm run start` – serve the compiled output (used by PM2 in production).
- `npm run lint` – Next.js ESLint preset across `src/`.
- `npm run deploy` – build then restart the `dexter-agents` PM2 process with `--update-env`.
- `npm run pm2:dev` / `npm run pm2:prod` – convenience wrappers for running under PM2 in hot reload or production mode.

## Deployment Notes
- Follow the PM2 definitions in `dexter-ops/ops/ecosystem.config.cjs`; the app expects `NODE_OPTIONS=--enable-source-maps` for readable logs.
- Set `NEXT_PUBLIC_SITE_URL` before deploying so share links and realtime callbacks point at the correct domain (currently `https://beta.dexter.cash`).
- nginx templates and TLS automation live in `dexter-ops/ops/nginx-sites/`; reuse them when adding new surfaces.

## Authentication & Sessions
- **Guest mode** is always available: the realtime backend receives a `guest_profile` and runs with demo wallet restrictions.
- **Signed-in mode** – pass the Cloudflare Turnstile check, request a magic link, and open it in the same browser profile. Supabase emits `dexter_session` metadata so the UI badge and realtime logs both reflect the user.
- `/auth/callback` keeps Supabase cookies in sync with auth state changes (`supabase.auth.onAuthStateChange`). If cookies go missing, double-check the Supabase redirect allow list and the Turnstile token.

## Docs & References
- `AGENTS.md` – contributor guide (style, testing, PR checklists).
- [`dexter-ops/OPERATIONS.md`](../dexter-ops/OPERATIONS.md) – PM2, nginx, smoke test procedures.
- [`docs.dexter.cash`](https://docs.dexter.cash) – long-form guides on agent flows, MCP tooling, and x402 integration.
- Issues or questions: open a ticket in the relevant repo and include harness artifacts or screenshots for faster triage.
