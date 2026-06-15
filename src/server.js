import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, isAbsolute, join, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { loadVantaConfig } from "./lib/env.js";
import { createVantaClient } from "./lib/vanta-client.js";
import {
  fetchVantaData,
  fetchVantaTestData,
  generateAssetMapSkeleton,
  loadFindingsFromFiles,
  loadTestsFromFiles,
  renderFindingsOutput,
} from "./lib/workflow.js";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(rootDir, "web");
const paths = {
  env: join(rootDir, ".env"),
  vulnerabilities: join(rootDir, "exports", "vulnerabilities.json"),
  assets: join(rootDir, "exports", "assets.json"),
  tests: join(rootDir, "exports", "tests.json"),
  testEntities: join(rootDir, "exports", "test-entities.json"),
  assetMap: join(rootDir, "config", "asset-map.json"),
};

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const port = Number(process.env.PORT ?? 4173);

const server = createServer(async (request, response) => {
  try {
    if (request.url?.startsWith("/api/")) {
      await handleApi(request, response);
      return;
    }

    await serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error([
      `Port ${port} is already in use. Open http://localhost:${port} or run with another port.`,
      "macOS/Linux: PORT=4174 npm run web",
      "Windows PowerShell: $env:PORT=4174; npm run web",
    ].join("\n"));
    process.exitCode = 1;
    return;
  }

  throw error;
});

server.listen(port, () => {
  console.log(`Vanta Findings Exporter running at http://localhost:${port}`);
});

async function handleApi(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/api/status") {
    sendJson(response, 200, await getStatus());
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/test-connection") {
    await testConnection();
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/fetch") {
    await fetchVantaData({
      vulnerabilitiesOut: paths.vulnerabilities,
      assetsOut: paths.assets,
      pageSize: "100",
    });
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/fetch-tests") {
    await fetchVantaTestData({
      testsOut: paths.tests,
      testEntitiesOut: paths.testEntities,
      pageSize: "100",
    });
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/generate-map-skeleton") {
    await generateAssetMapSkeleton({ assetsPath: paths.assets, outPath: paths.assetMap });
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/findings") {
    if (!(await filesExist(paths.vulnerabilities, paths.assets))) {
      sendJson(response, 200, {
        findings: [],
        summary: emptyFindingsSummary(),
        needsFetch: true,
        message: "No local vulnerability export found. Click 02 Fetch latest findings.",
      });
      return;
    }

    const filters = Object.fromEntries(url.searchParams.entries());
    const data = await loadFindingsFromFiles({
      vulnerabilitiesPath: paths.vulnerabilities,
      assetsPath: paths.assets,
      environmentMapPath: paths.assetMap,
      filters: {
        ...filters,
        fixableOnly: filters.fixableOnly === "true",
        overdue: filters.overdue === "true",
      },
    });
    sendJson(response, 200, { findings: data.findings, summary: serializeSummary(data.summary) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/tests") {
    if (!(await filesExist(paths.tests, paths.testEntities))) {
      sendJson(response, 200, {
        tests: [],
        summary: { totalTests: 0, failingEntities: 0, byCategory: {}, byIntegration: {} },
        needsFetch: true,
        message: "No local tests export found. Click 06 Fetch failing tests.",
      });
      return;
    }

    const data = await loadTestsFromFiles({
      testsPath: paths.tests,
      testEntitiesPath: paths.testEntities,
    });
    sendJson(response, 200, data);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/export") {
    const body = await readBody(request);
    const { format = "jira", groupBy = "service", filters = {} } = body;
    const { findings } = await loadFindingsFromFiles({
      vulnerabilitiesPath: paths.vulnerabilities,
      assetsPath: paths.assets,
      environmentMapPath: paths.assetMap,
      filters,
    });
    const output = renderFindingsOutput(findings, format, { groupBy });
    const outPath = join(rootDir, "exports", `web-${format}-by-${groupBy}.${format === "csv" ? "csv" : "txt"}`);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${output}\n`, "utf8");
    sendJson(response, 200, { ok: true, path: outPath, output });
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

function serializeSummary(summary) {
  return {
    totalFindings: summary.totalFindings,
    fixableFindings: summary.fixableFindings,
    bySeverity: countObjectToRows(summary.bySeverity),
    byPackage: countObjectToRows(summary.byPackage),
    byAsset: countObjectToRows(summary.byAsset),
    byOwner: countObjectToRows(summary.byOwner),
    byService: countObjectToRows(summary.byService),
    byRepository: countObjectToRows(summary.byRepository),
  };
}

function countObjectToRows(counts) {
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => ({ name, count }));
}

function emptyFindingsSummary() {
  return {
    totalFindings: 0,
    fixableFindings: 0,
    bySeverity: [],
    byPackage: [],
    byAsset: [],
    byOwner: [],
    byService: [],
    byRepository: [],
  };
}

async function filesExist(...filePaths) {
  const statuses = await Promise.all(filePaths.map(fileStatus));
  return statuses.every((status) => status.exists);
}

async function getStatus() {
  const [env, vulnerabilities, assets, tests, testEntities, assetMap] = await Promise.all([
    fileStatus(paths.env),
    fileStatus(paths.vulnerabilities),
    fileStatus(paths.assets),
    fileStatus(paths.tests),
    fileStatus(paths.testEntities),
    fileStatus(paths.assetMap),
  ]);

  return { env, vulnerabilities, assets, tests, testEntities, assetMap };
}

async function testConnection() {
  const config = await loadVantaConfig();
  const client = await createVantaClient(config);
  await client.fetchVulnerabilities({ pageSize: "1" });
}

async function fileStatus(path) {
  try {
    const result = await stat(path);
    return {
      exists: true,
      updatedAt: result.mtime.toISOString(),
      size: result.size,
    };
  } catch {
    return { exists: false, updatedAt: null, size: 0 };
  }
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(publicDir, requestedPath));
  const relativePath = relative(publicDir, filePath);

  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    await access(filePath);
    const content = await readFile(filePath);
    response.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream" });
    response.end(content);
  } catch {
    sendText(response, 404, "Not found");
  }
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(payload);
}
