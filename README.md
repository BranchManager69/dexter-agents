<p align="center">
  <img src="./public/wordmarks/dexter-wordmark.svg" alt="Dexter wordmark" width="360">
</p>

<h1 align="center">Dexter Voice</h1>

<p align="center">
  <a href="https://github.com/BranchManager69/dexter-api">Dexter API</a>
  · <a href="https://github.com/BranchManager69/dexter-fe">Dexter FE</a>
  · <strong>Dexter Voice</strong>
  · <a href="https://github.com/BranchManager69/dexter-mcp">Dexter MCP</a>
</p>

<p align="center">
  <a href="https://nodejs.org/en/download"><img src="https://img.shields.io/badge/node-%3E=20-green.svg" alt="Node >= 20"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/framework-Next.js%2015-black.svg" alt="Next.js 15"></a>
  <a href="https://github.com/openai/openai-agents-js"><img src="https://img.shields.io/badge/openai-agents-blue.svg" alt="OpenAI Agents"></a>
</p>

Dexter Voice is Dexter’s flagship voice interface for realtime agents. Alongside our ChatGPT, Claude, and X (Twitter) surfaces—and with Alexa/Siri assistants in active development—it delivers the most immersive way to run Dexter agents end-to-end. The stack pairs OpenAI Realtime + Agents with the Dexter MCP tool graph, Supabase-backed identity, and x402 micropayments to deliver a headset-ready console that can triage tickets, inspect Solana wallets, stage swaps, and escalate to specialists with zero context loss.

This is the surface we demo at Colosseum and to partners: the same build powers public walkthroughs, investor previews, and the regression harness we rely on before shipping any on-chain change.

> 🎤 **Try it live:** Head to [beta.dexter.cash](https://beta.dexter.cash) for the hosted demo. No login required—guest sessions run on a funded Dexter wallet and can perform real Solana swaps. When you do sign in, a personal Dexter agent wallet (prefixed `Dex-`) is minted and can be exported immediately for custody or audits.

---

## Core Capabilities
- **Voice-native operator console** – realtime WebRTC surface with speech recognition, guardrails, and transcript metrics so agents can work heads‑up.
- **Solana-first execution** – wallet diagnostics, swap previews, and trade execution run on managed wallets pulled from Dexter MCP, with signature provenance surfaced directly in the UI.
- **x402 micropayment enforcement** – every tool call and session is metered through Dexter API’s x402 billing pipeline so premium flows stay on-chain-auditable.
- **Scenario routing & handoffs** – configurable agent graphs escalate between customer support, concierge, trading, and human SIM personas while preserving context.
- **Observable tool orchestration** – MCP-backed tool notes render structured responses (wallet balances, pumpstream intel, Tavily research) without exposing credentials to the browser.
- **Playwright harness baked in** – the `dexchat` CLI launches full speech sessions to validate flows, regenerate Supabase storage state, and capture artifacts for CI.
- **Ops-ready deployment** – ships with PM2 + nginx scripts so the voice surface stays in lockstep with Dexter API and MCP releases.

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

## Featured MCP Tooling
- **Wallet resolution (`resolve_wallet`, `list_my_wallets`, `auth_info`)** – map the caller’s Supabase identity to managed Solana wallets, expose default/override assignments, and surface custody metadata before any trade fires.
- **Wallet override & storage (`set_session_wallet_override`)** – let operators or scripted flows pivot to a specific wallet while logging the change for compliance and feeding the voice UI’s badge stack.
- **Token intelligence (`solana_resolve_token`, `solana_list_balances`)** – pull metadata, price feeds, and current balances for the active wallet; results render as hash badges and token flow pills in the transcript.
- **Swap planning (`solana_swap_preview`)** – preview Jupiter routes, show pool hops + price impact, and record the simulated signature. Operators can gate execution on guardrail thresholds.
- **Swap execution (`solana_swap_execute`)** – perform routed swaps on managed wallets with on-chain signatures piped back into the UI and x402 invoice entries tallied by Dexter API.
- **Pumpstream market scan (`pumpstream_live_summary`)** – stream trending Solana tokens with live viewers, market cap, and momentum so the agent can narrate runway before a trade.
- **Research connectors (`search`, `fetch`)** – broker Tavily search and HTTP fetch calls to add off-chain context to conversations without exposing API keys to the browser.
- **Social sentiment (`twitter_topic_analysis`)** – summarize X/Twitter chatter around a project to complement on-chain signals.
- **Dexter harness utilities (`dexchat`, `pumpstream:harness`)** – run scripted sessions against the same toolkit to regenerate Playwright storage, validate MCP auth, and archive transcripts with their x402 ledger entries.

## Dexter Stack

| Repo | Role |
|------|------|
| [`dexter-api`](https://github.com/BranchManager69/dexter-api) | Issues realtime tokens, proxies MCP tools, settles x402 billing |
| [`dexter-fe`](https://github.com/BranchManager69/dexter-fe) | Browser client for production voice + chat surfaces |
| **`dexter-agents` (Dexter Voice)** | Voice interface + regression harness orchestrating MCP tools under x402 governance |
| [`dexter-mcp`](https://github.com/BranchManager69/dexter-mcp) | Managed MCP transport exposing wallet + trading tools |
| Dexter Ops (internal) | Private ops playbook with PM2 config and nginx templates |

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
- **Cloudflare Turnstile** – set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (same value the main surface uses) to render the security challenge before sending a magic link.
- **x402 micropayments** – keep `NEXT_PUBLIC_DEXTER_API_ORIGIN` aligned with your `dexter-api` deployment; that service tallies x402 usage for each tool call surfaced in the UI.
- Set `TOKEN_AI_MCP_TOKEN` for local MCP tool runs (or `HARNESS_MCP_TOKEN` when using the harness CLI); production keeps it in PM2 env so MCP connectors stay gated.
- When deployed through PM2, `npm run deploy` rebuilds the app and restarts the `dexter-agents` process with fresh environment variables.
- Logging knobs:
  - `LOG_LEVEL` defaults to `info`. Bump to `debug` when you need per-step traces, or drop to `warn` during noisy incidents.
  - `LOG_PRETTY=1` forces colorized pino output for PM2 and other log tails (leave unset for raw JSON shipping to collectors).

## Project Layout
- `src/app/App.tsx` – realtime UI state machine (transcript, guardrails, tool results).
- `src/app/agentConfigs/` – scenario definitions; register new configs in `index.ts`.
- `src/app/tools/` – tool logic invoked by agents (keep names aligned with MCP counterparts).
- `src/app/components/`, `hooks/`, `contexts/` – reusable UI/state primitives.
- `scripts/` – `dexchat.js` CLI and `runHarness.js` Playwright runner; artifacts land in `harness-results/` (git-ignored).
- `AGENTS.md` – contributor guidelines covering style, testing, and PR expectations.
- Internal diagrams and extended walkthroughs live in the private Dexter docs workspace; contact the team for access.

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
- `npm run logs:pretty` – colorized tail of `pm2 logs dexter-agents` piped through `pino-pretty`.

## Deployment Notes
- PM2 deployments should set `NODE_OPTIONS=--enable-source-maps` for readable logs.
- Set `NEXT_PUBLIC_SITE_URL` before deploying so share links and realtime callbacks point at the correct domain (currently `https://beta.dexter.cash`).
- Reuse your nginx/TLS templates to front the Next.js server (Dexter Ops maintains the internal reference implementation).

## Authentication & Sessions
- **Guest mode** is always available: the realtime backend issues a funded demo wallet so visitors can trade, swap, and explore every tool without signing in.
- **Signed-in mode** – run the Turnstile challenge, request a magic link, and open it in the same browser profile to bind your own Dexter wallet and persist history.

## Docs & References
- `AGENTS.md` – contributor guide (style, testing, PR checklists).
- Dexter Ops runbook (internal) – contact the team for PM2, nginx, and smoke test procedures.
- [`docs.dexter.cash`](https://docs.dexter.cash) – long-form guides on agent flows, MCP tooling, and x402 integration.
- Issues or questions: open a ticket in the relevant repo and include harness artifacts or screenshots for faster triage.
