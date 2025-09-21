#!/usr/bin/env node
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { runHarness } = require('./runHarness');

(async () => {
  const argv = yargs(hideBin(process.argv))
    .usage('$0 [options]', 'Run a scripted chat against the Dexter realtime agent.', (cmd) =>
      cmd
        .option('prompt', {
          alias: 'p',
          type: 'string',
          demandOption: true,
          describe: 'Message to send to the agent.',
        })
        .option('url', {
          alias: 'u',
          type: 'string',
          default: 'https://beta.dexter.cash/',
          describe: 'Target URL to load before running the conversation.',
        })
        .option('wait', {
          alias: 'w',
          type: 'number',
          default: 45000,
          describe: 'Time to wait (ms) after sending the prompt before snapshotting results.',
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          default: path.join(__dirname, '..', 'harness-results'),
          describe: 'Directory where run artifacts will be stored.',
        })
        .option('artifact', {
          type: 'boolean',
          default: true,
          describe: 'Write JSON artifact to disk (disable with --no-artifact).',
        })
        .option('headful', {
          type: 'boolean',
          default: false,
          describe: 'Run Playwright in headed mode (visible browser).',
        })
        .option('json', {
          type: 'boolean',
          default: false,
          describe: 'Print the artifact JSON to stdout when the run completes.',
        })
        .example('$0 --prompt "Check my wallet"', 'Run against beta with default settings.')
        .example('$0 -p "Test" -u http://localhost:3000/ -w 30000', 'Run against local dev for 30 seconds.')
        .help()
        .alias('help', 'h'),
    ).argv;

  try {
    const { artifact, artifactPath } = await runHarness({
      prompt: argv.prompt,
      targetUrl: argv.url,
      waitMs: argv.wait,
      outputDir: path.resolve(argv.output),
      headless: !argv.headful,
      saveArtifact: argv.artifact,
    });

    if (argv.json) {
      process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
    }

    if (artifactPath) {
      process.stdout.write(`Saved artifact: ${artifactPath}\n`);
    } else if (argv.artifact) {
      process.stdout.write('Run completed, but no artifact was written.\n');
    }
  } catch (error) {
    console.error('dexchat failed:', error.message || error);
    process.exitCode = 1;
  }
})();
