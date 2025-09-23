<p align="center">
  <img src="https://docs.dexter.cash/previews/dexter-fe.png" alt="Dexter FE" width="360">
</p>

<p align="center">
  <strong>Dexchat Harness</strong>
</p>

<h1 align="center">Dexchat CLI & Harness</h1>

<p align="center">
  <a href="https://nodejs.org/en/download"><img src="https://img.shields.io/badge/node-%3E=20-green.svg" alt="Node >= 20"></a>
  <a href="https://playwright.dev/"><img src="https://img.shields.io/badge/runtime-Playwright-blue.svg" alt="Playwright"></a>
  <a href="#usage"><img src="https://img.shields.io/badge/status-active-success.svg" alt="Active"></a>
</p>

End-to-end harness that drives the Dexter realtime demo, collects structured telemetry, and writes
replayable artifacts. The CLI lives beside the other project scripts so it can be invoked from
anywhere inside the repo or exported as a global command.

---

## Highlights

- **Single command runs** – `dexchat -p "..."` opens Playwright, sends a prompt, and streams
  console output live.
- **Structured captures** – every run records console logs, transcript bubbles, and the
  in-app event state for automated analysis.
- **Flexible targets** – default points at `https://beta.dexter.cash/`; override with
  `--url` or `HARNESS_TARGET_URL` to hit dev/staging.
- **Reusable runner** – shared `runHarness` module powers both the CLI and the original
  `check-realtime` script.

## Location

```
dexter-agents/
├── scripts/
│   ├── dexchat.js        # CLI entrypoint (also exposed via npm bin)
│   ├── runHarness.js     # Shared Playwright harness logic
│   ├── check-realtime.js # Legacy wrapper keeping env-based workflow
│   └── run-pumpstream-harness.js # Dual-mode (UI + API) pumpstream checks
└── harness-results/      # Timestamped JSON artifacts (git-ignored)
```

Artifacts are written to `harness-results/` unless you pass `--output` or run with
`--no-artifact`. The directory stays clean because it is ignored by git.

## Installation

```bash
# Install dependencies (Playwright, yargs, etc.)
npm install

# Optional: expose the CLI globally for this machine
npm link   # now `dexchat` works from any path
```

> **Note:** The harness scripts rely on the global `fetch` that ships with Node 20.
> Make sure you are running on Node.js v20 or newer before invoking them.

Without `npm link`, you can still run the tool via `npm run dexchat -- --prompt "..."`.

## Usage

```bash
node scripts/dexchat.js --prompt "Check wallet status"

# or with the npm alias
npm run dexchat -- --prompt "Check wallet status"

# or, after npm link
dexchat --prompt "Check wallet status"
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `-p, --prompt <text>` | (required) | Message to send to the agent. |
| `-u, --url <url>` | `https://beta.dexter.cash/` | Target origin for the harness. |
| `-w, --wait <ms>` | `45000` | How long to wait before snapshotting state. |
| `-o, --output <dir>` | `../harness-results` | Directory for JSON artifacts. |
| `--no-artifact` | `false` | Skip writing the JSON artifact. |
| `--headful` | `false` | Launch Playwright with a visible browser window. |
| `--json` | `false` | Print the run artifact to stdout when finished. |

Environment equivalents remain available for pipelines:

| Variable | Purpose |
|----------|---------|
| `HARNESS_TARGET_URL` | Override the default URL. |
| `HARNESS_PROMPT` | Provide the prompt when no CLI flag is passed. |
| `HARNESS_WAIT_MS` | Change wait duration without flags. |
| `HARNESS_OUTPUT_DIR` | Customize artifact directory. |
| `HARNESS_HEADLESS` | Set `false` to force headed mode. |
| `HARNESS_SAVE_ARTIFACT` | Set `false` to skip saving. |
| `HARNESS_API_BASE` | (Optional) Override the Dexter API base URL when minting MCP JWTs. |

## Artifacts

Each run writes `harness-results/run-<timestamp>.json` with:

- prompt, target URL, wait duration
- raw console events emitted during the session
- transcript bubbles rendered in the UI
- `structured.events` and `structured.transcripts`, matching the right-hand log panel

These snapshots are ideal for regression tests or diffing behavioral changes between agent
iterations. Combine with `--json` to push results straight into external tooling.

## Examples

```bash
# Beta run with custom prompt, stream JSON only (no files)
dexchat -p "Provide trading intel" --json --no-artifact

# Local dev run, shorter wait, keep artifact in a temp directory
dexchat -p "Smoke" -u http://localhost:3017/ -w 20000 -o /tmp/dexter-harness

# Watch Playwright execute by opening a headed browser
dexchat -p "List wallets" --headful
```

## Legacy Script

`scripts/check-realtime.js` remains for compatibility with existing workflows. It now delegates to
`runHarness.js` and respects the same environment variables, so any prior automation continues to
work without modification.

---

Questions or improvement ideas? Tag `#dexchat-harness` in issues so we can iterate quickly.

---

## Wrapper History

`runHarness.js` ships the actual Playwright logic. `dexchat.js` layers a modern CLI on
top of it, while `check-realtime.js` survives as a legacy wrapper that reads the same
inputs from `HARNESS_*` environment variables. We kept both entrypoints so older
automation (cron jobs, PM2 scripts, simple shell aliases) can continue to export env
vars without refactors, while newer workflows enjoy the richer CLI flags. Both paths
ultimately invoke the same harness engine, so behavior stays consistent regardless of
how it is triggered.

## Pumpstream Harness

```
npm run pumpstream:harness -- --mode both --page-size 5
```

- **Dual execution** – `--mode api` (default) hits the MCP tool directly, `--mode ui`
  replays the Playwright flow, and `--mode both` runs them in sequence for diffing.
- **Scenario defaults** – prompt and page-size align with the live pumpstream
  experience, but you can override them with flags or `HARNESS_*` env vars.
- **Auth inputs** – supply session context with `HARNESS_STORAGE_STATE`,
  `HARNESS_AUTHORIZATION`, or `HARNESS_COOKIE`. The script safely reuses the shared
  output directory guard so `HARNESS_OUTPUT_DIR=~/...` never punches outside the repo.
- **Zero-click bearer** – the harness resolves MCP auth automatically (env `HARNESS_MCP_TOKEN`
  → `TOKEN_AI_MCP_TOKEN` → mint per-user `dexter_mcp_jwt` from `HARNESS_COOKIE`
  via `/api/connector/oauth/token`), so runs succeed without manual DevTools work.
- **Artifacts** – UI runs land in `harness-results/` like Dexchat; API runs write
  `pumpstream-api-*.json` snapshots alongside them.
- **Overrides** – `HARNESS_MCP_URL` points the API run at an alternate MCP endpoint if
  you’re testing staging or local connectors.

Defaults: mode `api`, wait `45000` ms, page-size `5`, artifacts enabled. UI runs
require either a Playwright storage state file or cookies exported via
`HARNESS_PLAYWRIGHT_COOKIES` (JSON array with `domain`/`path`/`value`). API runs can
fall back to guest mode but need `HARNESS_MCP_TOKEN` when the connector redacts its
bearer.

Example cookies payload:

```json
[
  { "name": "dexter_session", "value": "...", "domain": "beta.dexter.cash", "path": "/", "httpOnly": true, "secure": true }
]
```

This scenario still imports the shared `runHarness` engine, so any improvements to the
core (storage-state handling, extra headers, quiet-window heuristics) flow into every
wrapper automatically.
