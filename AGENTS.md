# Repository Guidelines

## Ops Scope & Layout
- This repo anchors shared infrastructure for the Dexter stack: nginx templates, PM2 configs, smoke tests, and preview assets.
- Keep sibling repos (`dexter-api`, `dexter-fe`, `dexter-mcp`, `dexter-agents`) under `/home/branchmanager/websites/` so scripts can locate env files and publish assets without extra flags.
- Docs live under `ops/`, with deploy-ready assets stored in `/var/www/docs.dexter.cash/` (served via nginx).

## Commit & Review Expectations
- Favor single-purpose commits with imperative subjects (`Add pm2 helper for agents service`).
- Update `OPERATIONS.md` when changing deployment steps or port maps; cross-link issues in commit bodies if the change affects downstream services.
- Run `npm run smoke:prod` before merging changes that touch nginx, PM2, or environment loaders.

## Scripts & Utilities
- `dxsnap` – runs from anywhere, refreshes preview media and the shared wordmark quietly (`node ops/scripts/capture-previews.mjs --quiet`). Requires Playwright dependencies (run `npm install` and `npx playwright install --with-deps` once).
- `npm run capture:previews` – verbose variant for detailed output or troubleshooting.
- `ops/scripts/apply-nginx-alpha.sh` – example bootstrap for nginx configs; inspect outputs before running in production.
- **Dexchat harness** – `scripts/dexchat.js` exposes the Playwright driver with CLI flags; `scripts/check-realtime.js` is the legacy wrapper that reads the same parameters from `HARNESS_*` env vars. Both call `scripts/runHarness.js`, so behavior stays identical whether a run is triggered by flags or exported variables. `scripts/run-pumpstream-harness.js` extends the same engine with MCP API checks—use `npm run pumpstream:harness` when you need the dual UI+API scenario.

## Deployment & Verification
- PM2 process definitions live in `ops/ecosystem.config.cjs`. After edits, use `pm2 restart <process>` and confirm the change with `npm run smoke:prod`.
- nginx updates require `sudo nginx -t && sudo systemctl reload nginx`; keep config diffs small and documented.
- Shared assets (screenshots, wordmark) should be regenerated with `dxsnap` after any FE or docs change that affects previews.

## Knowledge Base
- `OPERATIONS.md` contains the condensed runbook (PM2, nginx, smoke tests, troubleshooting).
- `ops/previews/` houses the local copies of README media; synced to `https://docs.dexter.cash/previews/` on every `dxsnap` run.
- For long-form architecture notes, use the GitBook instance on `docs.dexter.cash` and link from this repo when relevant.
### Supabase Session Refresh

- Use the desktop helper `refresh-supabase-session.ps1` when the Turnstile/Supabase session expires. It launches the SOCKS proxy + Chrome, prints the DevTools snippet, and sends the encoded cookie to `scripts/update_harness_cookie.py` to rewrite HARNESS_COOKIE in both `.env` files. Choose the storage-refresh option to regenerate Playwright `state.json` after logging in.