#!/usr/bin/env node
// Pumpstream harness CLI retained for backwards compatibility.
// Delegates to the generic runner with the pumpstream tool selected, so it inherits
// all standard flags (`--mode api|ui|both`, `--guest`, etc.). API mode still makes a
// direct MCP tool call, while UI mode drives the Playwright chat flow. Prefer updating
// run-tool-harness.js or the tool registry when adding new features.

const { runToolHarness } = require('./lib/toolHarnessRunner');
const { getToolConfig, DEFAULT_TOOL_ID } = require('./lib/harnessTools');

async function main() {
  const tool = getToolConfig(DEFAULT_TOOL_ID);
  if (!tool) {
    throw new Error('Pumpstream tool configuration is missing.');
  }
  return runToolHarness(tool, process.argv.slice(2));
}

main().catch((error) => {
  console.error('Pumpstream harness run failed:', error?.message || error);
  if (error?.body) console.error('Response body:', error.body);
  process.exitCode = 1;
});
