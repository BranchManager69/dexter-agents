# Colorized PM2 Logging

## Context
Dexter API switched to a shared logger to make PM2 logs match the style we use in dexter-mcp (colored status tags, bright key/value pairs). The change is straightforward and re-usable in dexter-agents or any other service that wants the same output.

## High-Level Steps
1. **Add a logger helper**
   - Create `src/logger.ts` (or similar) that wraps `chalk` and exposes `createLogger()` plus a `style` helper for status/k/v formatting.
   - Inside `getColor()`, default `DEXTER_FORCE_COLOR`/`FORCE_COLOR` to `1` so Chalk emits colors even when PM2 isn’t attached to a TTY.
2. **Replace raw `console.*` calls**
   - Import the shared logger (`import { logger, style } from './logger.js'`) in each module.
   - Swap `console.log('[tag]', details)` with `logger.child('tag').info(...)`, using `style.status/kv/list` as needed.
   - Keep structure lightweight; don’t overprescribe format for components that have unique needs.
3. **Restart with updated env**
   - `npm run build` (or equivalent) and `pm2 restart dexter-agents --update-env` so the process sees the new `FORCE_COLOR` setting.
   - Tail logs with `pm2 logs dexter-agents --nostream` to confirm color output.

## Notes / Tweaks
- Existing logging abstractions can simply force Chalk colors; no need to copy/paste the entire helper.
- Log structured data as additional arguments so PM2 still prints deep objects (e.g., `logger.info(message, payload)`).
- The `style` helpers are optional—feel free to adapt or rename them to fit dexter-agents’ tone.
- Set `DEXTER_FORCE_COLOR=0` at runtime if a process needs plain text output (e.g., piping to another system).

## References
- `dexter-api/src/logger.ts`
- `dexter-api/src/app.ts` (usage patterns)
- `dexter-mcp/common.mjs` (original colored logs)
