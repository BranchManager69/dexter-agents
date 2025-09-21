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
examples/openai-realtime-agents/
├── scripts/
│   ├── dexchat.js        # CLI entrypoint (also exposed via npm bin)
│   ├── runHarness.js     # Shared Playwright harness logic
│   └── check-realtime.js # Legacy wrapper keeping env-based workflow
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
