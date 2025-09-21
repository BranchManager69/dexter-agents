# Repository Guidelines

## Project Structure & Module Organization
- `src/app/App.tsx` orchestrates realtime UI state, moderation, and tool events.
- `src/app/agentConfigs/` houses scenario definitions; register new configs in `index.ts` so they surface in the Scenario picker.
- Reusable UI and state live in `src/app/components/`, `hooks/`, and `contexts/`.
- Harness scripts sit in `scripts/` (`dexchat.js`, `runHarness.js`); Playwright artifacts land in `harness-results/`.
- Static assets and screenshots live in `public/`; global styles are in `src/app/globals.css` with Tailwind tokens from `tailwind.config.ts`.

## Build, Test, and Development Commands
- `npm run dev` – start the Next.js dev server on `http://localhost:3000`.
- `npm run build` – produce the production bundle used by pm2.
- `npm run start` – serve the built app; pm2 calls this in production.
- `npm run lint` – run the Next.js ESLint preset across `src/`.
- `npm run dexchat -- --prompt "Smoke"` – execute the Playwright harness against the default target; add `--url http://localhost:3000` for local smoke tests.

## Coding Style & Naming Conventions
- TypeScript is strict (`tsconfig.json:strict=true`); resolve imports with the `@/` alias.
- Favor functional React components, hooks, and explicit return types; keep server/client components split by file naming (`page.tsx`, `layout.tsx`).
- Use 2-space indentation, descriptive camelCase for variables/functions, and PascalCase for components and agent configs.
- Tailwind classes drive styling; group utility classes logically and extract shared styles into components when they grow.

## Testing Guidelines
- Playwright handles E2E coverage; add specs under `tests/e2e/` (create if missing) and run via `npx playwright test`.
- Pair major agent changes with a `dexchat` harness run; include the `harness-results/run-*.json` summary in PRs.
- Cover the happy path plus one failure or guardrail scenario when adding tools or flows.

## Commit & Pull Request Guidelines
- Follow concise, imperative commit titles (`Refine agent selection flow`); include context in the body when touching configs or scripts.
- Squash small WIP commits before review; ensure lint and Playwright smoke checks pass locally.
- PRs need a purpose-driven description, linked issues (if any), screenshots or terminal captures for UI changes, and call out new env vars or migrations.

## Agent & Environment Tips
- Copy `.env.sample` to configure `OPENAI_API_KEY`, `NEXT_PUBLIC_SITE_URL`, and agent model overrides before running locally.
- When introducing a new agent scenario, expose it via `agentConfigs/index.ts`, seed defaults in `config/agentPresets.ts`, and double-check tool logic in `tools/` for consistent naming.
