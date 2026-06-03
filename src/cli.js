#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { loadVantaConfig } from "./lib/env.js";
import { normalizeFindings } from "./lib/normalize.js";
import { filterFindings } from "./lib/filters.js";
import { buildSummary } from "./lib/summary.js";
import { renderCsv, renderJiraTasks, renderJson, renderMarkdownSummary, renderOperationalTasks } from "./lib/render.js";
import { createVantaClient } from "./lib/vanta-client.js";

const usage = `Usage:
  node src/cli.js summarize --vulnerabilities <file> --assets <file> [--environment-map <file>] [--severity <level>] [--package <name>] [--environment <name>] [--asset <name>] [--due-before YYYY-MM-DD] [--overdue] [--due-soon <days>] [--fixable-only] [--format markdown|json|csv]
  node src/cli.js tasks --vulnerabilities <file> --assets <file> [--environment-map <file>] [--severity <level>] [--package <name>] [--environment <name>] [--asset <name>] [--due-before YYYY-MM-DD] [--overdue] [--due-soon <days>] [--fixable-only] [--format tasks|jira]
  node src/cli.js fetch --vulnerabilities-out <file> --assets-out <file> [--page-size <number>]
  node src/cli.js export [--environment-map <file>] [--severity <level>] [--package <name>] [--environment <name>] [--asset <name>] [--due-before YYYY-MM-DD] [--overdue] [--due-soon <days>] [--fixable-only] [--format markdown|json|csv|tasks|jira] [--page-size <number>]

Examples:
  node src/cli.js summarize --vulnerabilities fixtures/vanta-vulnerabilities.sample.json --assets fixtures/vanta-assets.sample.json
  node src/cli.js summarize --vulnerabilities fixtures/vanta-vulnerabilities.sample.json --assets fixtures/vanta-assets.sample.json --environment-map fixtures/environment-map.sample.json
  node src/cli.js summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --severity high --fixable-only
  node src/cli.js summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --package nginx --environment production
  node src/cli.js summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --asset production-api
  node src/cli.js summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --due-before 2026-06-11
  node src/cli.js summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --due-soon 14
  node src/cli.js fetch --vulnerabilities-out exports/vulnerabilities.json --assets-out exports/assets.json
  node src/cli.js export --severity high --fixable-only --format csv
  node src/cli.js export --environment production --format jira
  node src/cli.js tasks --vulnerabilities fixtures/vanta-vulnerabilities.sample.json --assets fixtures/vanta-assets.sample.json
`;

async function main(argv) {
  const [command, ...rest] = argv;
  const options = parseOptions(rest);

  if (!command || command === "help" || options.help) {
    console.log(usage);
    return;
  }

  if (!["summarize", "tasks", "fetch", "export"].includes(command)) {
    throw new Error(`Unknown command: ${command}`);
  }

  if (command === "fetch") {
    await fetchVantaData(options);
    return;
  }

  if (command === "export") {
    await exportVantaData(options);
    return;
  }

  if (!options.vulnerabilities || !options.assets) {
    throw new Error("Missing required --vulnerabilities and --assets files.");
  }

  const [vulnerabilityResponse, assetResponse] = await Promise.all([
    readJson(options.vulnerabilities),
    readJson(options.assets),
  ]);
  const findings = await buildFilteredFindings(vulnerabilityResponse, assetResponse, options);

  if (command === "tasks") {
    console.log(renderFindings(findings, options.format ?? "tasks"));
    return;
  }

  const format = options.format ?? "markdown";

  console.log(renderFindings(findings, format));
}

async function fetchVantaData(options) {
  if (!options["vulnerabilities-out"] || !options["assets-out"]) {
    throw new Error("Missing required --vulnerabilities-out and --assets-out files.");
  }

  const config = await loadVantaConfig();
  const client = await createVantaClient(config);
  const pageSize = options["page-size"] ?? "100";

  const [vulnerabilities, assets] = await Promise.all([
    client.fetchVulnerabilities({ pageSize }),
    client.fetchVulnerableAssets({ pageSize }),
  ]);

  await Promise.all([
    writeJson(options["vulnerabilities-out"], vulnerabilities),
    writeJson(options["assets-out"], assets),
  ]);

  console.log(`Wrote vulnerabilities to ${options["vulnerabilities-out"]}`);
  console.log(`Wrote vulnerable assets to ${options["assets-out"]}`);
}

async function exportVantaData(options) {
  const config = await loadVantaConfig();
  const client = await createVantaClient(config);
  const pageSize = options["page-size"] ?? "100";

  const [vulnerabilityResponse, assetResponse] = await Promise.all([
    client.fetchVulnerabilities({ pageSize }),
    client.fetchVulnerableAssets({ pageSize }),
  ]);

  const findings = await buildFilteredFindings(vulnerabilityResponse, assetResponse, options);
  const format = options.format ?? "markdown";

  console.log(renderFindings(findings, format));
}

async function buildFilteredFindings(vulnerabilityResponse, assetResponse, options) {
  const environmentMap = options["environment-map"] ? await readJson(options["environment-map"]) : {};

  return filterFindings(normalizeFindings(vulnerabilityResponse, assetResponse, { environmentMap }), {
    severity: options.severity,
    fixableOnly: Boolean(options["fixable-only"]),
    package: options.package,
    environment: options.environment,
    asset: options.asset,
    dueBefore: options["due-before"],
    overdue: Boolean(options.overdue),
    dueSoon: options["due-soon"],
  });
}

function renderFindings(findings, format) {
  const summary = buildSummary(findings);

  if (format === "json") {
    return renderJson(findings, summary);
  }

  if (format === "csv") {
    return renderCsv(findings);
  }

  if (format === "tasks") {
    return renderOperationalTasks(findings);
  }

  if (format === "jira") {
    return renderJiraTasks(findings);
  }

  if (format !== "markdown") {
    throw new Error(`Unsupported format: ${format}`);
  }

  return renderMarkdownSummary(summary);
}

function parseOptions(args) {
  const options = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);

    if (["help", "fixable-only", "overdue"].includes(key)) {
      options[key] = true;
      continue;
    }

    const value = args[i + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    options[key] = value;
    i += 1;
  }

  return options;
}

async function readJson(path) {
  const content = await readFile(path, "utf8");
  return JSON.parse(content);
}

async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
