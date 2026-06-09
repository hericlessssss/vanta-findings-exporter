import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildAssetMapSkeleton } from "./asset-map.js";
import { loadVantaConfig } from "./env.js";
import { filterFindings } from "./filters.js";
import { normalizeFindings } from "./normalize.js";
import { normalizeTests } from "./normalize-tests.js";
import { renderCsv, renderJiraTasks, renderJson, renderMarkdownSummary, renderOperationalTasks } from "./render.js";
import { buildSummary } from "./summary.js";
import { createVantaClient } from "./vanta-client.js";

export async function readJsonFile(path) {
  const content = await readFile(path, "utf8");
  return JSON.parse(stripByteOrderMark(content));
}

export async function writeJsonFile(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function fetchVantaData({ vulnerabilitiesOut, assetsOut, pageSize = "100" }) {
  const config = await loadVantaConfig();
  const client = await createVantaClient(config);

  const [vulnerabilities, assets] = await Promise.all([
    client.fetchVulnerabilities({ pageSize }),
    client.fetchVulnerableAssets({ pageSize }),
  ]);

  await Promise.all([
    writeJsonFile(vulnerabilitiesOut, vulnerabilities),
    writeJsonFile(assetsOut, assets),
  ]);

  return { vulnerabilitiesOut, assetsOut };
}

export async function fetchVantaTestData({ testsOut, testEntitiesOut, pageSize = "100" }) {
  const config = await loadVantaConfig();
  const client = await createVantaClient(config);
  const tests = await client.fetchTests({
    pageSize,
    query: { statusFilter: "NEEDS_ATTENTION" },
  });
  const testItems = tests.results.flatMap((result) => result.data ?? []);
  const entityEntries = await Promise.all(
    testItems.map(async (test) => [
      test.id,
      await client.fetchTestEntities(test.id, {
        pageSize,
        query: { entityStatus: "FAILING" },
      }),
    ]),
  );
  const testEntities = Object.fromEntries(entityEntries);

  await Promise.all([
    writeJsonFile(testsOut, tests),
    writeJsonFile(testEntitiesOut, testEntities),
  ]);

  return { testsOut, testEntitiesOut };
}

export async function generateAssetMapSkeleton({ assetsPath, outPath }) {
  const assetResponse = await readJsonFile(assetsPath);
  const skeleton = buildAssetMapSkeleton(assetResponse);
  await writeJsonFile(outPath, skeleton);
  return { outPath };
}

export async function loadFindingsFromFiles({ vulnerabilitiesPath, assetsPath, environmentMapPath, filters = {} }) {
  const [vulnerabilityResponse, assetResponse, environmentMap] = await Promise.all([
    readJsonFile(vulnerabilitiesPath),
    readJsonFile(assetsPath),
    environmentMapPath ? readJsonFile(environmentMapPath) : Promise.resolve({}),
  ]);

  const findings = filterFindings(
    normalizeFindings(vulnerabilityResponse, assetResponse, { environmentMap }),
    normalizeFilters(filters),
  );
  const summary = buildSummary(findings);

  return { findings, summary };
}

export async function loadTestsFromFiles({ testsPath, testEntitiesPath }) {
  const [testResponse, entityResponsesByTestId] = await Promise.all([
    readJsonFile(testsPath),
    readJsonFile(testEntitiesPath),
  ]);
  const tests = normalizeTests(testResponse, entityResponsesByTestId);

  return {
    tests,
    summary: {
      totalTests: tests.length,
      failingEntities: tests.reduce((sum, test) => sum + test.failingEntities.length, 0),
      byCategory: countBy(tests, "category"),
      byIntegration: countBy(tests, "integration"),
    },
  };
}

export function renderFindingsOutput(findings, format, options = {}) {
  const summary = buildSummary(findings);

  if (format === "json") {
    return renderJson(findings, summary);
  }

  if (format === "csv") {
    return renderCsv(findings);
  }

  if (format === "tasks") {
    return renderOperationalTasks(findings, { groupBy: options.groupBy ?? "severity" });
  }

  if (format === "jira") {
    return renderJiraTasks(findings, { groupBy: options.groupBy ?? "severity" });
  }

  if (format !== "markdown") {
    throw new Error(`Unsupported format: ${format}`);
  }

  return renderMarkdownSummary(summary);
}

export function stripByteOrderMark(content) {
  return content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
}

function normalizeFilters(filters) {
  return {
    severity: emptyToUndefined(filters.severity),
    fixableOnly: Boolean(filters.fixableOnly),
    package: emptyToUndefined(filters.package),
    environment: emptyToUndefined(filters.environment),
    asset: emptyToUndefined(filters.asset),
    owner: emptyToUndefined(filters.owner),
    service: emptyToUndefined(filters.service),
    repository: emptyToUndefined(filters.repository),
    dueBefore: emptyToUndefined(filters.dueBefore),
    overdue: Boolean(filters.overdue),
    dueSoon: emptyToUndefined(filters.dueSoon),
  };
}

function emptyToUndefined(value) {
  return value === "" || value === null ? undefined : value;
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}
