#!/usr/bin/env node
// Generic harness entry point for Dexter tool scenarios.
// - `--mode api` calls the MCP tool directly (no agent prompt or browser), useful for
//   validating tool responses but bypassing conversational behavior.
// - `--mode ui` launches Playwright and posts the prompt through the realtime agent.
// - `--mode both` runs UI first, then API, so outputs can be compared side by side.
// Auth expectations:
//   * API runs need an MCP bearer via HARNESS_MCP_TOKEN / TOKEN_AI_MCP_TOKEN, or a
//     HARNESS_COOKIE that lets the harness mint one.
//   * UI runs need storage state or cookies unless `--guest` is set.
// Limitations: API mode skips agent guardrails; UI mode will fail fast on stale Supabase
// sessions. See scripts/README.md for full flag documentation.

const { runToolHarness } = require('./lib/toolHarnessRunner');
const { getToolConfig, TOOL_REGISTRY, DEFAULT_TOOL_ID } = require('./lib/harnessTools');

function extractToolAndArgs(argv) {
  const remaining = [];
  let toolId = null;
  let listTools = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--tool' || arg === '-t') {
      toolId = argv[i + 1] || null;
      i += 1;
      continue;
    }
    if (arg === '--list-tools') {
      listTools = true;
      continue;
    }
    remaining.push(arg);
  }
  return { toolId, argv: remaining, listTools };
}

function printToolList() {
  const entries = Object.values(TOOL_REGISTRY);
  if (!entries.length) {
    console.log('No tools registered.');
    return;
  }
  console.log('Available harness tools:');
  for (const tool of entries) {
    console.log(` - ${tool.id}${tool.label ? `: ${tool.label}` : ''}`);
  }
}

async function main() {
  const { toolId, argv, listTools } = extractToolAndArgs(process.argv.slice(2));
  if (listTools) {
    printToolList();
    return;
  }
  const selectedId = toolId || DEFAULT_TOOL_ID;
  const tool = getToolConfig(selectedId);
  if (!tool) {
    console.error(`Unknown harness tool: ${selectedId}`);
    printToolList();
    process.exit(1);
  }
  return runToolHarness(tool, argv);
}

main().catch((error) => {
  console.error('Harness run failed:', error?.message || error);
  if (error?.body) console.error('Response body:', error.body);
  process.exitCode = 1;
});
